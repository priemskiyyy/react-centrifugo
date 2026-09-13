import { Centrifuge, UnauthorizedError } from "centrifuge";
import { expect, test, vi } from "vitest";
import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";
import type { ConfigurationSource } from "src/types/internal/ConfigurationSource";
import { RealtimeClientStore } from "src/utils/RealtimeClientStore";
import { ResourceScope } from "src/utils/internal/ResourceScope";
import { createTestSessionConfiguration } from "src/utils/tests/createTestSessionConfiguration";

const transport = "ws://localhost:8000/connection/websocket";
const createSession = (configuration: ConfigurationSource) => {
  vi.spyOn(Centrifuge.prototype, "connect").mockImplementation(() => {});
  const store = new RealtimeClientStore();
  const dispose = store.session.set(configuration);
  const client = store.api.client.get();

  if (client === null) {
    throw new Error("Expected an active client");
  }

  return { store, client, dispose };
};

const getSubscriptionOptions = (
  session: ReturnType<typeof createSession>,
  channel: string,
  scope = new ResourceScope(),
) => {
  const create = vi.spyOn(session.client, "newSubscription");
  scope.addCleanup(
    session.store.api.channels
      .get(channel)
      .events.subscribe("publication", () => {}),
  );
  const options = create.mock.calls.at(-1)?.[1];

  if (options === undefined) {
    throw new Error("Expected subscription options passed to the SDK");
  }

  return options;
};

test.each(["getToken", "getData"] satisfies Array<"getToken" | "getData">)(
  "a queued %s cannot run after its subscription is released",
  async (callbackName) => {
    const getValue = vi.fn(async () => "current");
    const session = createSession(
      createTestSessionConfiguration({
        session: { id: "user" },
        transport,
        getSubscriptionOptions: () => ({
          getToken: getValue,
          getData: getValue,
        }),
      }),
    );
    const scope = new ResourceScope();
    const callback = getSubscriptionOptions(session, "rooms:one", scope)[
      callbackName
    ];
    const result = callback?.({ channel: "rooms:one" });
    scope.dispose();

    try {
      await expect(result).rejects.toBeInstanceOf(UnauthorizedError);
      expect(getValue).not.toHaveBeenCalled();
      const nextCallback = getSubscriptionOptions(session, "rooms:one")[
        callbackName
      ];
      await expect(nextCallback?.({ channel: "rooms:one" })).resolves.toBe(
        "current",
      );
    } finally {
      session.dispose();
    }
  },
);

test.each(["getToken", "getData"] satisfies Array<"getToken" | "getData">)(
  "a late %s result is discarded after its subscription is released",
  async (callbackName) => {
    let resolveValue: (value: string) => void = (value) => {
      throw new Error(`Unexpected value: ${value}`);
    };
    const pendingValue = new Promise<string>((resolve) => {
      resolveValue = resolve;
    });
    const getValue = vi.fn(() => pendingValue);
    const session = createSession(
      createTestSessionConfiguration({
        session: { id: "user" },
        transport,
        getSubscriptionOptions: () => ({
          getToken: getValue,
          getData: getValue,
        }),
      }),
    );
    const scope = new ResourceScope();
    const callback = getSubscriptionOptions(session, "rooms:one", scope)[
      callbackName
    ];
    const result = callback?.({ channel: "rooms:one" });
    await Promise.resolve();
    scope.dispose();
    resolveValue("stale");

    try {
      expect(getValue).toHaveBeenCalledTimes(1);
      await expect(result).rejects.toBeInstanceOf(UnauthorizedError);
      getValue.mockResolvedValue("fresh");
      const nextCallback = getSubscriptionOptions(session, "rooms:one")[
        callbackName
      ];
      await expect(nextCallback?.({ channel: "rooms:one" })).resolves.toBe(
        "fresh",
      );
    } finally {
      session.dispose();
    }
  },
);

test("subscription token callbacks read fresh credentials without replacing the session", async () => {
  let token = "first";
  const configuration: CentrifugeConfiguration = {
    session: { id: "user" },
    transport,
    getSubscriptionOptions: () => ({ getToken: async () => token }),
  };
  const session = createSession(createTestSessionConfiguration(configuration));
  const getToken = getSubscriptionOptions(session, "private:one").getToken;
  expect(await getToken?.({ channel: "private:one" })).toBe("first");
  token = "second";
  expect(await getToken?.({ channel: "private:one" })).toBe("second");
  session.dispose();
  await expect(getToken?.({ channel: "private:one" })).rejects.toBeInstanceOf(
    UnauthorizedError,
  );
});

test("subscription data callbacks read fresh data and stop after disposal", async () => {
  let locale = "en";
  const getData = vi.fn(async () => ({ locale }));
  const session = createSession(
    createTestSessionConfiguration({
      session: { id: "user" },
      transport,
      getSubscriptionOptions: () => ({ getData }),
    }),
  );
  const readData = getSubscriptionOptions(session, "rooms:one").getData;

  expect(await readData?.({ channel: "rooms:one" })).toEqual({ locale: "en" });
  locale = "de";
  expect(await readData?.({ channel: "rooms:one" })).toEqual({ locale: "de" });
  session.dispose();

  await expect(readData?.({ channel: "rooms:one" })).rejects.toBeInstanceOf(
    UnauthorizedError,
  );
  expect(getData).toHaveBeenCalledTimes(2);
});

test("discards credentials resolved after the session ends", async () => {
  let resolveToken: (token: string) => void = (token) => {
    throw new Error(`Unexpected token: ${token}`);
  };
  const pending = new Promise<string>((resolve) => {
    resolveToken = resolve;
  });
  const getToken = vi.fn(() => pending);
  const configuration: CentrifugeConfiguration = {
    session: { id: "user" },
    transport,
    getSubscriptionOptions: () => ({ getToken }),
  };
  const session = createSession(createTestSessionConfiguration(configuration));
  const result = getSubscriptionOptions(session, "private:one").getToken?.({
    channel: "private:one",
  });
  await Promise.resolve();
  expect(getToken).toHaveBeenCalledTimes(1);
  session.dispose();
  resolveToken("stale");
  await expect(result).rejects.toBeInstanceOf(UnauthorizedError);
});

test("a queued callback cannot read credentials after its session ends", async () => {
  const getToken = vi.fn(async () => "new-account-token");
  const session = createSession(
    createTestSessionConfiguration({
      session: { id: "user" },
      transport,
      getSubscriptionOptions: () => ({ getToken }),
    }),
  );
  const result = getSubscriptionOptions(session, "private:one").getToken?.({
    channel: "private:one",
  });

  session.dispose();

  await expect(result).rejects.toBeInstanceOf(UnauthorizedError);
  expect(getToken).not.toHaveBeenCalled();
});

test("normalizes synchronous credential errors and leaves public channels unauthenticated", async () => {
  const failure = new Error("token unavailable");
  const configuration: CentrifugeConfiguration = {
    session: { id: "user" },
    transport,
  };
  const session = createSession(createTestSessionConfiguration(configuration));
  expect(getSubscriptionOptions(session, "anything#user")).toEqual({});
  const authenticated = {
    ...configuration,
    getSubscriptionOptions: () => ({
      getToken: () => {
        throw failure;
      },
    }),
  };
  const privateSession = createSession(
    createTestSessionConfiguration(authenticated),
  );
  await expect(
    getSubscriptionOptions(privateSession, "private:one").getToken?.({
      channel: "private:one",
    }),
  ).rejects.toBe(failure);
  session.dispose();
  privateSession.dispose();
});
