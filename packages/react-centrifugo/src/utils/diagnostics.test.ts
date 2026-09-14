import { Centrifuge } from "centrifuge";
import type { SubscriptionErrorContext } from "centrifuge";
import { beforeEach, expect, test, vi } from "vitest";
import { RealtimeClientStore } from "src/utils/RealtimeClientStore";
import type { RealtimeDiagnosticEvent } from "src/types/RealtimeDiagnostics";

const configuration = (id = "test") => ({
  get: () => ({ session: { id }, transport: "ws://localhost" }),
});

beforeEach(() => {
  vi.spyOn(Centrifuge.prototype, "connect").mockImplementation(() => {});
});

test("inspection creates no channels and never keeps subscriptions alive", () => {
  const store = new RealtimeClientStore();
  const diagnostics = store.api.diagnostics;
  const stopEvents = diagnostics.events.subscribe(() => {});
  const stopChanges = diagnostics.subscribe(() => {});
  const end = store.session.set(configuration());
  const client = store.api.client.get();
  expect(diagnostics.get().channels).toEqual([]);
  expect(client?.subscriptions()).toEqual({});

  const channel = store.api.channels.get("rooms:one");
  const stopStatus = channel.status.subscribe(() => {});
  expect(client?.subscriptions()).toEqual({});
  expect(diagnostics.get().channels).toEqual([
    {
      name: "rooms:one",
      state: "detached",
      error: null,
      consumers: { events: 0, status: 1 },
    },
  ]);
  const stopConsumer = channel.events.subscribe("publication", () => {});
  const subscription = client?.getSubscription("rooms:one");
  expect(diagnostics.get().channels[0]?.consumers).toEqual({
    events: 1,
    status: 1,
  });
  stopConsumer();
  expect(client?.subscriptions()).toEqual({});
  expect(subscription?.listeners("publication")).toHaveLength(0);
  expect(diagnostics.get().channels[0]?.state).toBe("detached");
  stopStatus();
  expect(diagnostics.get().channels).toEqual([]);
  end();
  stopEvents();
  stopChanges();
});

test("late observers capture each native publication once regardless of consumer count", () => {
  const store = new RealtimeClientStore();
  const end = store.session.set(configuration());
  const channel = store.api.channels.get("rooms:one");
  const first = vi.fn();
  const second = vi.fn();
  const stopFirst = channel.events.subscribe("publication", first);
  const stopSecond = channel.events.subscribe("publication", second);
  const subscription = store.api.client.get()?.getSubscription("rooms:one");
  const log = vi.fn();
  const stop = store.api.diagnostics.events.subscribe(log);
  subscription?.emit("publication", {
    channel: "rooms:one",
    data: { text: "hello" },
    offset: 5,
  });
  expect(log).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      type: "publication",
      channel: "rooms:one",
      context: expect.objectContaining({ offset: 5 }),
    }),
  );
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  stop();
  expect(subscription?.listeners("publication")).toHaveLength(1);
  stopFirst();
  stopSecond();
  end();
});

test("session replacement retires old observations and snapshots contain only metadata", () => {
  const store = new RealtimeClientStore();
  const events: RealtimeDiagnosticEvent[] = [];
  const stop = store.api.diagnostics.events.subscribe((event) =>
    events.push(event),
  );
  const endFirst = store.session.set(configuration("first"));
  const first = store.api.client.get();
  const endSecond = store.session.set(configuration("second"));
  expect(first?.listeners("connected")).toHaveLength(0);
  first?.emit("connected", { client: "stale", transport: "websocket" });
  expect(events.filter((event) => event.type === "connected")).toEqual([]);
  expect(store.api.diagnostics.get()).toEqual({
    session: { id: "second" },
    connection: "disconnected",
    channels: [],
  });
  expect(
    events.filter((event) => event.type === "session.started"),
  ).toHaveLength(2);
  endFirst();
  expect(store.api.diagnostics.get().session).toEqual({ id: "second" });
  endSecond();
  expect(store.api.diagnostics.get().session).toBeNull();
  stop();
});

test("snapshot edits do not mutate channel ownership or SDK error objects", () => {
  const store = new RealtimeClientStore();
  const end = store.session.set(configuration());
  const stop = store.api.channels
    .get("rooms:one")
    .events.subscribe("publication", () => {});
  const subscription = store.api.client.get()?.getSubscription("rooms:one");
  const error: SubscriptionErrorContext = {
    channel: "rooms:one",
    type: "subscribe",
    error: { code: 123, message: "Denied" },
  };
  subscription?.emit("error", error);
  const snapshot = store.api.diagnostics.get();
  const channel = snapshot.channels[0];
  if (channel === undefined || channel.error === null)
    throw new Error("Missing channel error");
  channel.consumers.events = 0;
  channel.error.message = "edited";
  expect(error.error.message).toBe("Denied");
  expect(subscription).not.toBeNull();
  stop();
  expect(store.api.client.get()?.subscriptions()).toEqual({});
  end();
});
