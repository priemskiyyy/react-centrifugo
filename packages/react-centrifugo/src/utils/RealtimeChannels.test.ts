import { Centrifuge } from "centrifuge";
import { expect, test, vi } from "vitest";
import { RealtimeChannels } from "src/utils/RealtimeChannels";
import { ResourceScope } from "src/utils/internal/ResourceScope";
import { DETACHED_CHANNEL_STATUS } from "src/utils/constants/realtimeChannel";

const createSession = () => {
  const client = new Centrifuge("ws://localhost:8000");
  const scope = new ResourceScope();
  const subscribe = vi.spyOn(client, "newSubscription");
  const remove = vi.spyOn(client, "removeSubscription");

  return {
    client,
    scope,
    subscribe,
    remove,
    view: {
      id: Symbol("session"),
      client: {
        newSubscription: subscribe.bind(client),
        removeSubscription: remove.bind(client),
      },
      configuration: { get: () => ({ getSubscriptionOptions: () => ({}) }) },
      scope: { adopt: scope.adopt },
    },
  };
};

test("passive status observers share a stable detached snapshot without opening subscriptions", () => {
  const session = createSession();
  const channels = new RealtimeChannels({ get: () => session.view });
  const first = channels.get("rooms:one");
  const second = channels.get("rooms:two");
  const listener = vi.fn();
  const stop = first.status.subscribe(listener);

  try {
    channels.subscribeAll();
    expect(first.status.get()).toBe(DETACHED_CHANNEL_STATUS);
    expect(second.status.get()).toBe(DETACHED_CHANNEL_STATUS);
    expect(channels.get("rooms:one").status.get()).toBe(first.status.get());
    expect(session.subscribe).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    stop();
    expect(first.status.get()).toBe(DETACHED_CHANNEL_STATUS);
  } finally {
    stop();
    session.scope.dispose();
    session.client.disconnect();
  }
});

test("narrow session views share and replace subscriptions by ID even when each read returns a new object", () => {
  const first = createSession();
  const second = createSession();
  let session = first.view;
  const channels = new RealtimeChannels({ get: () => ({ ...session }) });
  const consumers = new ResourceScope();
  const channel = channels.get("rooms:one");
  const onPublication = vi.fn();

  try {
    consumers.addCleanup(
      channel.events.subscribe("publication", onPublication),
    );
    consumers.addCleanup(channel.events.subscribe("join", () => {}));
    channels.subscribeAll();

    expect(first.subscribe).toHaveBeenCalledTimes(1);
    expect(first.client.getSubscription("rooms:one")).not.toBeNull();

    session = second.view;
    channels.subscribeAll();

    expect(first.remove).toHaveBeenCalledTimes(1);
    expect(first.client.getSubscription("rooms:one")).toBeNull();
    expect(second.subscribe).toHaveBeenCalledTimes(1);

    first.scope.dispose();
    expect(second.remove).not.toHaveBeenCalled();

    const subscription = second.client.getSubscription("rooms:one");
    if (subscription === null) {
      throw new Error("Expected a subscription on the replacement session");
    }

    const publication = { channel: "rooms:one", data: "current" };
    subscription.emit("publication", publication);
    expect(onPublication).toHaveBeenCalledExactlyOnceWith(publication);

    consumers.dispose();
    expect(second.remove).toHaveBeenCalledTimes(1);
    expect(second.client.getSubscription("rooms:one")).toBeNull();
  } finally {
    consumers.dispose();
    first.scope.dispose();
    second.scope.dispose();
    first.client.disconnect();
    second.client.disconnect();
  }
});
