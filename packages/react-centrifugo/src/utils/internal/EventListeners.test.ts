import { Centrifuge } from "centrifuge";
import type { ClientEvents } from "centrifuge";
import { expect, test, vi } from "vitest";
import { EventListeners } from "src/utils/internal/EventListeners";
import { ResourceScope } from "src/utils/internal/ResourceScope";

const createTestEvents = () => {
  const client = new Centrifuge("ws://localhost:8000");
  const scope = new ResourceScope();
  const events = new EventListeners<ClientEvents>();
  events.bind(client, scope);

  return { client, scope, events };
};

test.each(["listener", "scope"])(
  "disposing a %s during SDK dispatch prevents later delivery to its listeners",
  (target) => {
    const { client, scope, events } = createTestEvents();
    const handler = vi.fn();
    events.subscribe("connected", () => {
      if (target === "scope") {
        scope.dispose();
        return;
      }

      stop();
    });
    const stop = events.subscribe("connected", handler);

    client.emit("connected", { client: "one", transport: "websocket" });

    expect(handler).not.toHaveBeenCalled();
    scope.dispose();
    stop();
    expect(client.listeners("connected")).toEqual([]);
    const stopLate = events.subscribe("connected", handler);
    expect(client.listeners("connected")).toEqual([]);
    client.emit("connected", { client: "two", transport: "websocket" });
    expect(handler).not.toHaveBeenCalled();
    stopLate();
  },
);

test("failed event handlers preserve sibling delivery and future SDK events", async () => {
  const scheduledErrors: Array<() => void> = [];
  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
    scheduledErrors.push(callback);
  });
  const { client, scope, events } = createTestEvents();
  const syncFailure = new Error("synchronous failure");
  const asyncFailure = new Error("asynchronous failure");
  events.subscribe("connected", () => {
    throw syncFailure;
  });
  events.subscribe("connected", () => Promise.reject(asyncFailure));
  const handler = vi.fn();
  events.subscribe("connected", handler);
  const context = { client: "one", transport: "websocket" };

  client.emit("connected", context);
  client.emit("connected", context);
  await Promise.resolve();

  expect(handler).toHaveBeenCalledTimes(2);
  expect(handler.mock.calls[0]?.[0]).toBe(context);
  expect(scheduledErrors).toHaveLength(4);
  expect(scheduledErrors[0]).toThrow(syncFailure);
  expect(scheduledErrors[2]).toThrow(asyncFailure);
  scope.dispose();
});

test("ending an owner during event registration prevents delivery and releases the new listener", () => {
  const client = new Centrifuge("ws://localhost:8000");
  const scope = new ResourceScope();
  const events = new EventListeners<ClientEvents>();
  events.bind(client, scope);
  const handler = vi.fn();
  const on = client.on.bind(client);
  const context = { client: "one", transport: "websocket" };
  vi.spyOn(client, "on").mockImplementationOnce((event, listener) => {
    on(event, listener);
    scope.dispose();
    client.emit("connected", context);
    return client;
  });

  const stop = events.subscribe("connected", handler);
  client.emit("connected", context);
  stop();

  expect(handler).not.toHaveBeenCalled();
  expect(client.listeners("connected")).toEqual([]);
});

test("failed event registration releases ownership and permits a later registration", () => {
  const client = new Centrifuge("ws://localhost:8000");
  const first = new ResourceScope();
  const events = new EventListeners<ClientEvents>();
  events.bind(client, first);
  const failure = new Error("event registration failed");
  vi.spyOn(client, "on").mockImplementationOnce(() => {
    throw failure;
  });
  const handler = vi.fn();

  expect(() => events.subscribe("connected", handler)).toThrow(failure);
  expect(first.isActive()).toBe(true);

  const stop = events.subscribe("connected", handler);
  const context = { client: "one", transport: "websocket" };
  client.emit("connected", context);
  first.dispose();
  stop();

  expect(handler).toHaveBeenCalledExactlyOnceWith(context);
  expect(client.listeners("connected")).toEqual([]);
});

test("listeners added during dispatch wait for the next event", () => {
  const { client, scope, events } = createTestEvents();
  const added = vi.fn();
  const stopFirst = events.subscribe("connected", () => {
    stopFirst();
    events.subscribe("connected", added);
  });
  const context = { client: "one", transport: "websocket" };
  client.emit("connected", context);
  expect(added).not.toHaveBeenCalled();
  client.emit("connected", context);
  expect(added).toHaveBeenCalledExactlyOnceWith(context);
  scope.dispose();
});

test("a native listener registered before on throws is still removed", () => {
  const { client, scope, events } = createTestEvents();
  const on = client.on.bind(client);
  const failure = new Error("partial binding failure");
  vi.spyOn(client, "on").mockImplementationOnce((event, listener) => {
    on(event, listener);
    throw failure;
  });
  expect(() => events.subscribe("connected", () => {})).toThrow(failure);
  expect(client.listeners("connected")).toEqual([]);
  const listener = vi.fn();
  events.subscribe("connected", listener);
  client.emit("connected", { client: "one", transport: "websocket" });
  expect(listener).toHaveBeenCalledTimes(1);
  scope.dispose();
});

test.each(["same", "different"])(
  "binding the %s emitter under one scope preserves delivery with one native bridge",
  (target) => {
    const first = new Centrifuge("ws://localhost:8000");
    const next =
      target === "same" ? first : new Centrifuge("ws://localhost:8000");
    const scope = new ResourceScope();
    const events = new EventListeners<ClientEvents>();
    const handler = vi.fn();
    const stop = events.subscribe("connected", handler);
    const context = { client: "one", transport: "websocket" };
    const on = vi.spyOn(next, "on");
    const off = vi.spyOn(first, "off");
    events.bind(first, scope);
    first.emit("connected", context);
    events.bind(next, scope);
    events.bind(next, scope);
    next.emit("connected", context);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(on).toHaveBeenCalledTimes(1);
    expect(off).toHaveBeenCalledTimes(target === "same" ? 0 : 1);
    expect(next.listeners("connected")).toHaveLength(1);
    expect(first.listeners("connected")).toHaveLength(
      target === "same" ? 1 : 0,
    );
    scope.dispose();
    stop();
    expect(first.listeners("connected")).toEqual([]);
    expect(next.listeners("connected")).toEqual([]);
  },
);

test.each(["same", "different"])(
  "rebinding the %s emitter during dispatch preserves the correct listener snapshot",
  (target) => {
    const first = new Centrifuge("ws://localhost:8000");
    const next =
      target === "same" ? first : new Centrifuge("ws://localhost:8000");
    const scope = new ResourceScope();
    const events = new EventListeners<ClientEvents>();
    events.subscribe("connected", () => events.bind(next, scope));
    const later = vi.fn();
    events.subscribe("connected", later);
    events.bind(first, scope);
    const firstContext = { client: "first", transport: "websocket" };
    first.emit("connected", firstContext);
    expect(later).toHaveBeenCalledTimes(target === "same" ? 1 : 0);
    const nextContext = { client: "next", transport: "websocket" };
    next.emit("connected", nextContext);
    expect(later.mock.calls).toEqual(
      target === "same" ? [[firstContext], [nextContext]] : [[nextContext]],
    );
    scope.dispose();
  },
);

test.each(["same", "different"])(
  "ending the old owner leaves a new binding to the %s emitter intact",
  (target) => {
    const first = new Centrifuge("ws://localhost:8000");
    const next =
      target === "same" ? first : new Centrifuge("ws://localhost:8000");
    const firstScope = new ResourceScope();
    const nextScope = new ResourceScope();
    const events = new EventListeners<ClientEvents>();
    const handler = vi.fn();
    events.subscribe("connected", handler);
    events.bind(first, firstScope);
    events.bind(next, nextScope);
    firstScope.dispose();
    // A stale owner also cannot bind itself again.
    events.bind(first, firstScope);
    const context = { client: "next", transport: "websocket" };
    next.emit("connected", context);
    expect(handler).toHaveBeenCalledExactlyOnceWith(context);
    expect(next.listeners("connected")).toHaveLength(1);
    nextScope.dispose();
    next.emit("connected", context);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(next.listeners("connected")).toEqual([]);
  },
);

test("retrying a partially failed binding installs missing bridges without replacing successful ones", () => {
  const first = new Centrifuge("ws://localhost:8000");
  const next = new Centrifuge("ws://localhost:8000");
  const scope = new ResourceScope();
  const events = new EventListeners<ClientEvents>();
  const connected = vi.fn();
  const disconnected = vi.fn();
  events.subscribe("connected", connected);
  events.subscribe("disconnected", disconnected);
  events.bind(first, scope);
  const failure = new Error("disconnected binding failed");
  const on = next.on.bind(next);
  const register = vi
    .spyOn(next, "on")
    .mockImplementationOnce(on)
    .mockImplementationOnce(() => {
      throw failure;
    });
  expect(() => events.bind(next, scope)).toThrow(failure);
  expect(scope.isActive()).toBe(true);
  const successfulBridge = next.listeners("connected")[0];
  events.bind(next, scope);
  expect(register).toHaveBeenCalledTimes(3);
  expect(next.listeners("connected")).toEqual([successfulBridge]);
  expect(next.listeners("disconnected")).toHaveLength(1);
  expect(first.listeners("connected")).toEqual([]);
  expect(first.listeners("disconnected")).toEqual([]);
  const connectedContext = { client: "next", transport: "websocket" };
  const disconnectedContext = { code: 0, reason: "test" };
  next.emit("connected", connectedContext);
  next.emit("disconnected", disconnectedContext);
  expect(connected).toHaveBeenCalledExactlyOnceWith(connectedContext);
  expect(disconnected).toHaveBeenCalledExactlyOnceWith(disconnectedContext);
  scope.dispose();
  expect(next.listeners("connected")).toEqual([]);
  expect(next.listeners("disconnected")).toEqual([]);
});

test.each(["rebind", "replace listener"])(
  "a nested %s during native removal cannot create a duplicate bridge",
  (action) => {
    const first = new Centrifuge("ws://localhost:8000");
    const next = new Centrifuge("ws://localhost:8000");
    const scope = new ResourceScope();
    const events = new EventListeners<ClientEvents>();
    const handler = vi.fn();
    const stop = events.subscribe("connected", handler);
    let stopReplacement = () => {};
    events.bind(first, scope);
    const register = vi.spyOn(next, "on");
    const off = first.off.bind(first);
    vi.spyOn(first, "off").mockImplementationOnce((event, listener) => {
      off(event, listener);

      if (action === "rebind") {
        events.bind(next, scope);
        return first;
      }

      stop();
      stopReplacement = events.subscribe("connected", handler);
      return first;
    });

    events.bind(next, scope);
    const context = { client: "next", transport: "websocket" };
    next.emit("connected", context);
    expect(handler).toHaveBeenCalledExactlyOnceWith(context);
    expect(register).toHaveBeenCalledTimes(1);
    expect(first.listeners("connected")).toEqual([]);
    expect(next.listeners("connected")).toHaveLength(1);
    stop();
    stopReplacement();
    scope.dispose();
    expect(next.listeners("connected")).toEqual([]);
  },
);
