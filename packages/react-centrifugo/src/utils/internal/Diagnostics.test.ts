import { Centrifuge } from "centrifuge";
import type { ClientEvents } from "centrifuge";
import { expect, test, vi } from "vitest";
import { Diagnostics } from "src/utils/internal/Diagnostics";
import { ResourceScope } from "src/utils/internal/ResourceScope";

const createDiagnostics = () =>
  new Diagnostics(() => ({
    session: null,
    connection: "disconnected",
    channels: [],
  }));

test("snapshots are stable between changes and notifications are batched", async () => {
  const diagnostics = createDiagnostics();
  const notify = vi.fn();
  const stop = diagnostics.api.subscribe(notify);
  const first = diagnostics.api.get();
  expect(diagnostics.api.get()).toBe(first);
  diagnostics.changed();
  diagnostics.changed();
  expect(diagnostics.api.get()).not.toBe(first);
  expect(notify).not.toHaveBeenCalled();
  await Promise.resolve();
  expect(notify).toHaveBeenCalledTimes(1);
  diagnostics.changed();
  stop();
  await Promise.resolve();
  expect(notify).toHaveBeenCalledTimes(1);
});

test("native observation is shared, starts lazily, and releases the last observer", () => {
  const diagnostics = createDiagnostics();
  const client = new Centrifuge("ws://localhost");
  const scope = new ResourceScope();
  diagnostics.observe<ClientEvents>(client, ["connected"], scope);
  expect(client.listeners("connected")).toHaveLength(0);
  const listener = vi.fn();
  const stopFirst = diagnostics.api.events.subscribe(listener);
  const stopSecond = diagnostics.api.events.subscribe(listener);
  expect(client.listeners("connected")).toHaveLength(1);
  const context = { client: "one", transport: "websocket" };
  client.emit("connected", context);
  expect(listener).toHaveBeenCalledTimes(2);
  stopFirst();
  stopFirst();
  expect(client.listeners("connected")).toHaveLength(1);
  stopSecond();
  expect(client.listeners("connected")).toHaveLength(0);
  scope.dispose();
});

test("disposing the source removes native listeners even while recording", () => {
  const diagnostics = createDiagnostics();
  const client = new Centrifuge("ws://localhost");
  const scope = new ResourceScope();
  const listener = vi.fn();
  const stop = diagnostics.api.events.subscribe(listener);
  diagnostics.observe<ClientEvents>(client, ["connected"], scope);
  const late = client.listeners("connected")[0];
  scope.dispose();
  expect(client.listeners("connected")).toHaveLength(0);
  late?.({ client: "old", transport: "websocket" });
  expect(listener).not.toHaveBeenCalled();
  stop();
});

test("a source that registers and then throws rolls its listener back", () => {
  const diagnostics = createDiagnostics();
  const client = new Centrifuge("ws://localhost");
  const scope = new ResourceScope();
  const stop = diagnostics.api.events.subscribe(() => {});
  const original = client.on.bind(client);
  vi.spyOn(client, "on").mockImplementation((event, listener) => {
    original(event, listener);
    throw new Error("failed to observe");
  });
  expect(() =>
    diagnostics.observe<ClientEvents>(client, ["connected"], scope),
  ).toThrow("failed to observe");
  expect(client.listeners("connected")).toHaveLength(0);
  stop();
  scope.dispose();
});
