import { UnauthorizedError } from "centrifuge";
import { expect, test, vi } from "vitest";
import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";
import { getConnectionOptions } from "src/utils/internal/getConnectionOptions";
import { ResourceScope } from "src/utils/internal/ResourceScope";

test("missing options remain empty even if callbacks are added to the live configuration", () => {
  const get = vi.fn(() => ({ options: { getToken: async () => "new" } }));
  const options = getConnectionOptions(undefined, { get }, new ResourceScope());

  expect(options).toEqual({});
  expect(get).not.toHaveBeenCalled();
});

test("copies initial options while callbacks read the latest options with their method receiver", async () => {
  const firstToken = vi.fn(async () => "first");
  const firstData = vi.fn(async () => "first");
  const initial = {
    name: "initial",
    timeout: 750,
    getToken: firstToken,
    getData: firstData,
  };
  let current: Pick<CentrifugeConfiguration, "options"> = { options: initial };
  const options = getConnectionOptions(
    initial,
    { get: () => current },
    new ResourceScope(),
  );
  const context = {};
  const data = { locale: "de" };
  const latest = {
    name: "latest",
    timeout: 1500,
    token: "latest-token",
    data,
    async getToken(received: object) {
      expect(received).toBe(context);
      return this.token;
    },
    async getData() {
      return this.data;
    },
  };
  current = { options: latest };

  expect(options).not.toBe(initial);
  expect(initial.getToken).toBe(firstToken);
  expect(initial.getData).toBe(firstData);
  expect(options.name).toBe("initial");
  expect(options.timeout).toBe(750);
  if (typeof options.getToken !== "function") {
    throw new Error("Expected token callback");
  }
  if (typeof options.getData !== "function") {
    throw new Error("Expected data callback");
  }

  await expect(options.getToken(context)).resolves.toBe("latest-token");
  await expect(options.getData()).resolves.toBe(data);
  expect(firstToken).not.toHaveBeenCalled();
  expect(firstData).not.toHaveBeenCalled();
});

test.each(["getToken", "getData"] satisfies Array<"getToken" | "getData">)(
  "%s rejects when the latest options or callback are removed",
  async (name) => {
    const initial = {
      getToken: async () => "token",
      getData: async () => "data",
    };
    let current: Pick<CentrifugeConfiguration, "options"> = {
      options: initial,
    };
    const options = getConnectionOptions(
      initial,
      { get: () => current },
      new ResourceScope(),
    );
    const callback = options[name];
    if (typeof callback !== "function") {
      throw new Error("Expected credential callback");
    }

    current = {};
    await expect(callback({})).rejects.toBeInstanceOf(UnauthorizedError);
    current = { options: {} };
    await expect(callback({})).rejects.toBeInstanceOf(UnauthorizedError);
    current = { options: { getToken: null, getData: null } };
    await expect(callback({})).rejects.toBeInstanceOf(UnauthorizedError);
  },
);

test.each(["getToken", "getData"] satisfies Array<"getToken" | "getData">)(
  "a queued %s cannot read configuration after the connection scope ends",
  async (name) => {
    const initial = {
      getToken: vi.fn(async () => "token"),
      getData: vi.fn(async () => "data"),
    };
    const get = vi.fn(() => ({ options: initial }));
    const scope = new ResourceScope();
    const options = getConnectionOptions(initial, { get }, scope);
    const callback = options[name];
    if (typeof callback !== "function") {
      throw new Error("Expected credential callback");
    }

    const pending = callback({});
    scope.dispose();
    await expect(pending).rejects.toBeInstanceOf(UnauthorizedError);
    expect(get).not.toHaveBeenCalled();
    expect(initial[name]).not.toHaveBeenCalled();
  },
);
