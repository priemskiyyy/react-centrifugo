// @vitest-environment jsdom
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { Centrifuge, State, SubscriptionState } from "centrifuge";
import { StrictMode } from "react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CentrifugeProvider } from "src/context/CentrifugeProvider";
import { createChannelEventHooks } from "src/index";
import { useChannel } from "src/index";
import { useChannelStatus } from "src/index";
import { useCentrifuge } from "src/hooks/useCentrifuge";
import { useClientEvent } from "src/hooks/useClientEvent";
import { useConnectionState } from "src/index";
import { useSubscriptionEvent } from "src/hooks/useSubscriptionEvent";
import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";

const configuration: CentrifugeConfiguration = {
  session: { id: "test" },
  transport: "ws://localhost:8000/connection/websocket",
};

const wrapper = ({ children }: PropsWithChildren) => (
  <CentrifugeProvider configuration={configuration}>
    {children}
  </CentrifugeProvider>
);

const requireClient = (client: Centrifuge | null) => {
  if (client === null) {
    throw new Error("Expected an active client");
  }

  return client;
};

const requireSubscription = (
  client: Centrifuge | null,
  channel = "rooms:one",
) => {
  const subscription = requireClient(client).getSubscription(channel);
  if (subscription === null) {
    throw new Error(`Expected subscription ${channel}`);
  }
  return subscription;
};

beforeEach(() => {
  vi.spyOn(Centrifuge.prototype, "connect").mockImplementation(function (
    this: Centrifuge,
  ) {
    this.state = State.Connecting;
    this.emit("state", {
      oldState: State.Disconnected,
      newState: State.Connecting,
    });
  });
});
afterEach(cleanup);

describe("provider and subscriptions", () => {
  test("exposes the native client while the provider owns session cleanup", () => {
    const { result, rerender, unmount } = renderHook(useCentrifuge, {
      wrapper,
    });
    const client = result.current;

    expect(client).toBeInstanceOf(Centrifuge);
    rerender();
    expect(result.current).toBe(client);
    unmount();
  });

  test("requires an explicit provider", () => {
    expect(() => renderHook(() => useCentrifuge())).toThrow(
      "within a CentrifugeProvider",
    );
  });

  test("returns null while the provider's session is disabled", () => {
    const disabledWrapper = ({ children }: PropsWithChildren) => (
      <CentrifugeProvider
        configuration={{
          ...configuration,
          session: { id: "test", enabled: false },
        }}
      >
        {children}
      </CentrifugeProvider>
    );
    const { result } = renderHook(() => useCentrifuge(), {
      wrapper: disabledWrapper,
    });

    expect(result.current).toBeNull();
    expect(Centrifuge.prototype.connect).not.toHaveBeenCalled();
  });

  test("observes client availability and replacement independently of connection state", () => {
    let session = { id: "first", enabled: true };
    const sessionWrapper = ({ children }: PropsWithChildren) => (
      <CentrifugeProvider configuration={{ ...configuration, session }}>
        {children}
      </CentrifugeProvider>
    );
    const rendered = vi.fn();
    const { result, rerender, unmount } = renderHook(
      () => {
        const client = useCentrifuge();
        rendered(client);
        return client;
      },
      { wrapper: sessionWrapper },
    );
    const first = requireClient(result.current);
    expect(rendered.mock.calls[0]).toEqual([null]);
    expect(first.state).toBe(State.Connecting);

    session = { id: "first", enabled: true };
    rerender();
    expect(result.current).toBe(first);

    session = { id: "second", enabled: true };
    rerender();
    const second = requireClient(result.current);
    expect(second).not.toBe(first);
    expect(second.state).toBe(State.Connecting);
    expect(first.state).toBe(State.Disconnected);

    rendered.mockClear();
    act(() => {
      second.state = State.Connected;
      second.emit("state", {
        oldState: State.Connecting,
        newState: State.Connected,
      });
    });
    expect(result.current).toBe(second);
    expect(rendered).not.toHaveBeenCalled();

    session = { id: "second", enabled: false };
    rerender();
    expect(result.current).toBeNull();
    expect(second.state).toBe(State.Disconnected);

    session = { id: "second", enabled: true };
    rerender();
    const third = requireClient(result.current);
    expect(third).not.toBe(second);
    unmount();
    expect(third.state).toBe(State.Disconnected);
  });

  test("shares a subscription and removes it after the last consumer", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ enabled }) => {
        useChannel("rooms:one", first, { enabled });
        useChannel("rooms:one", second);
        return useCentrifuge();
      },
      { wrapper, initialProps: { enabled: true } },
    );
    const client = requireClient(result.current);
    const subscription = requireSubscription(result.current);
    expect(Object.keys(client.subscriptions())).toEqual(["rooms:one"]);
    act(() => {
      subscription.emit("publication", {
        channel: "rooms:one",
        data: "first",
        offset: 7,
      });
    });
    // The provider's own context arrives under `native`.
    expect(first).toHaveBeenCalledWith(
      "first",
      expect.objectContaining({
        native: expect.objectContaining({ offset: 7 }),
      }),
    );
    expect(second).toHaveBeenCalledTimes(1);
    rerender({ enabled: false });
    expect(requireSubscription(result.current)).toBe(subscription);
    act(() => {
      subscription.emit("publication", {
        channel: "rooms:one",
        data: "second",
      });
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    unmount();
    expect(client.subscriptions()).toEqual({});
  });

  test("fresh callbacks and parsers do not recreate subscriptions", () => {
    const received: string[] = [];
    const { result, rerender } = renderHook(
      ({ label }) => {
        useChannel(
          "rooms:one",
          (data) => {
            received.push(`${label}:${data}`);
          },
          { parse: (data) => `${label}-${String(data)}` },
        );
        return useCentrifuge();
      },
      { wrapper, initialProps: { label: "before" } },
    );
    const subscription = requireSubscription(result.current);
    rerender({ label: "after" });
    expect(requireSubscription(result.current)).toBe(subscription);
    act(() => {
      subscription.emit("publication", {
        channel: "rooms:one",
        data: "message",
      });
    });
    expect(received).toEqual(["after:after-message"]);
  });

  test("changing a channel detaches the old subscription", () => {
    const handler = vi.fn();
    const { result, rerender } = renderHook(
      ({ channel }) => {
        useChannel(channel, handler);
        return useCentrifuge();
      },
      { wrapper, initialProps: { channel: "rooms:one" } },
    );
    const previous = requireSubscription(result.current);
    rerender({ channel: "rooms:two" });
    expect(
      requireClient(result.current).getSubscription("rooms:one"),
    ).toBeNull();
    act(() => {
      previous.emit("publication", { channel: "rooms:one", data: "stale" });
    });
    expect(handler).not.toHaveBeenCalled();
    expect(requireSubscription(result.current, "rooms:two")).toBeDefined();
  });

  test("status observers are passive and survive subscriber cleanup", () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => {
        useChannel("rooms:one", () => {}, { enabled });
        return {
          status: useChannelStatus("rooms:one"),
          client: useCentrifuge(),
        };
      },
      { wrapper, initialProps: { enabled: false } },
    );
    expect(requireClient(result.current.client).subscriptions()).toEqual({});
    expect(result.current.status.state).toBe("detached");
    rerender({ enabled: true });
    expect(result.current.status.state).toBe("subscribing");
    const subscription = requireSubscription(result.current.client);
    act(() => {
      subscription.emit("error", {
        channel: "rooms:one",
        type: "subscribe",
        error: { code: 1, message: "retry" },
      });
    });
    // The runtime keeps the provider's error as it arrived, untyped.
    expect(result.current.status.error).toEqual({
      error: {
        channel: "rooms:one",
        type: "subscribe",
        error: { code: 1, message: "retry" },
      },
    });
    act(() => {
      subscription.emit("state", {
        channel: "rooms:one",
        oldState: SubscriptionState.Subscribing,
        newState: SubscriptionState.Subscribed,
      });
    });
    expect(result.current.status).toEqual({ state: "subscribed", error: null });
    rerender({ enabled: false });
    expect(result.current.status).toEqual({
      state: "detached",
      error: null,
    });
    rerender({ enabled: true });
    expect(requireSubscription(result.current.client)).not.toBe(subscription);
  });

  test("session object identity is inert, while id and enabled control the connection", () => {
    const clients: Centrifuge[] = [];
    const Capture = () => {
      useChannel("rooms:one", () => {});
      const connection = useConnectionState();
      const client = useCentrifuge();
      if (client !== null && !clients.includes(client)) {
        clients.push(client);
      }
      return <span>{connection}</span>;
    };
    const View = ({ id, enabled }: { id: string; enabled: boolean }) => (
      <CentrifugeProvider
        configuration={{ ...configuration, session: { id, enabled } }}
      >
        <Capture />
      </CentrifugeProvider>
    );
    const view = render(<View id="one" enabled />);
    expect(clients).toHaveLength(1);
    view.rerender(<View id="one" enabled />);
    expect(clients).toHaveLength(1);
    view.rerender(<View id="two" enabled />);
    expect(clients).toHaveLength(2);
    expect(clients[0]?.subscriptions()).toEqual({});
    view.rerender(<View id="two" enabled={false} />);
    expect(view.getByText("disconnected")).toBeDefined();
    expect(clients[1]?.subscriptions()).toEqual({});
    view.rerender(<View id="two" enabled />);
    expect(clients).toHaveLength(3);
  });

  test("StrictMode leaves one registered subscription", () => {
    const strictWrapper = ({ children }: PropsWithChildren) => (
      <StrictMode>{wrapper({ children })}</StrictMode>
    );
    const { result, unmount } = renderHook(
      () => {
        useChannel("rooms:one", () => {});
        return useCentrifuge();
      },
      { wrapper: strictWrapper },
    );
    const client = requireClient(result.current);
    expect(Object.keys(client.subscriptions())).toEqual(["rooms:one"]);
    unmount();
    expect(client.subscriptions()).toEqual({});
  });

  test("client listeners see the initial transition and subscription listeners expose recovery metadata", () => {
    const onClientState = vi.fn();
    const onSubscribed = vi.fn();
    const { result } = renderHook(
      () => {
        useClientEvent("state", onClientState);
        useSubscriptionEvent("rooms:one", "subscribed", onSubscribed);
        return useCentrifuge();
      },
      { wrapper },
    );
    expect(onClientState).toHaveBeenCalledWith({
      oldState: "disconnected",
      newState: "connecting",
    });
    act(() => {
      requireSubscription(result.current).emit("subscribed", {
        channel: "rooms:one",
        recoverable: true,
        positioned: true,
        wasRecovering: true,
        recovered: false,
        hasRecoveredPublications: false,
      });
    });
    expect(onSubscribed).toHaveBeenCalledWith(
      expect.objectContaining({ wasRecovering: true, recovered: false }),
    );
  });
});

describe("parsing and typed events", () => {
  test("the provider supplies fresh token callbacks without replacing the subscription", async () => {
    const createSubscription = vi.spyOn(
      Centrifuge.prototype,
      "newSubscription",
    );
    const firstToken = vi.fn(async () => "first");
    const secondToken = vi.fn(async () => "second");
    const Listener = () => {
      useChannel("rooms:one", () => {});
      return null;
    };
    const View = ({ getToken }: { getToken: () => Promise<string> }) => (
      <CentrifugeProvider
        configuration={{
          ...configuration,
          getSubscriptionOptions: () => ({ getToken }),
        }}
      >
        <Listener />
      </CentrifugeProvider>
    );
    const view = render(<View getToken={firstToken} />);
    const options = createSubscription.mock.calls[0]?.[1];
    expect(await options?.getToken?.({ channel: "rooms:one" })).toBe("first");
    view.rerender(<View getToken={secondToken} />);
    expect(await options?.getToken?.({ channel: "rooms:one" })).toBe("second");
    expect(createSubscription).toHaveBeenCalledTimes(1);
    expect(firstToken).toHaveBeenCalledTimes(1);
    expect(secondToken).toHaveBeenCalledTimes(1);
  });

  test("parser failures and rejected handlers are reported without interrupting sibling delivery", async () => {
    const scheduledErrors: Array<() => void> = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
      scheduledErrors.push(callback);
    });
    const sibling = vi.fn();
    const parseError = new Error("invalid payload");
    const callbackError = new Error("handler rejected");
    const { result } = renderHook(
      () => {
        useChannel("rooms:one", () => {}, {
          parse: () => {
            throw parseError;
          },
        });
        useChannel("rooms:one", () => Promise.reject(callbackError));
        useChannel("rooms:one", sibling);
        return useCentrifuge();
      },
      { wrapper },
    );
    act(() => {
      requireSubscription(result.current).emit("publication", {
        channel: "rooms:one",
        data: null,
      });
    });
    await Promise.resolve();
    expect(sibling).toHaveBeenCalledTimes(1);
    expect(scheduledErrors).toHaveLength(2);
    expect(scheduledErrors[0]).toThrow(parseError);
    expect(scheduledErrors[1]).toThrow(callbackError);
  });

  test("decodes arbitrary envelopes and parses only matching event payloads", () => {
    type Events = {
      "message.created": { channel: `rooms:${string}`; payload: string };
    };
    const { useChannelEvent } = createChannelEventHooks<Events>({
      // The runtime hands the decoder the whole publication.
      decode: ({ data }) => {
        if (
          typeof data !== "object" ||
          data === null ||
          !("name" in data) ||
          !("body" in data) ||
          typeof data.name !== "string"
        ) {
          return null;
        }
        return { eventType: data.name, payload: data.body };
      },
    });
    const parse = vi.fn((data: unknown) => String(data));
    const onMessage = vi.fn();
    const { result } = renderHook(
      () => {
        useChannelEvent("rooms:one", "message.created", onMessage, { parse });
        return useCentrifuge();
      },
      { wrapper },
    );
    act(() => {
      const subscription = requireSubscription(result.current);
      subscription.emit("publication", {
        channel: "rooms:one",
        data: { name: "other", body: 1 },
      });
      subscription.emit("publication", {
        channel: "rooms:one",
        data: { name: "message.created", body: 42 },
      });
    });
    expect(parse).toHaveBeenCalledExactlyOnceWith(42);
    expect(onMessage).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({
        native: expect.objectContaining({ channel: "rooms:one" }),
      }),
    );
  });
});
