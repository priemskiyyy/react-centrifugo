import { createTestSessionConfiguration } from "src/utils/tests/createTestSessionConfiguration";
import { Centrifuge, State, Subscription } from "centrifuge";
import { beforeEach, expect, test, vi } from "vitest";
import { RealtimeClientStore } from "src/utils/RealtimeClientStore";
import { ValueStore } from "src/utils/internal/ValueStore";
import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";

const configuration: CentrifugeConfiguration = {
  session: { id: "test" },
  transport: "ws://localhost:8000",
};

beforeEach(() => {
  vi.spyOn(Centrifuge.prototype, "connect").mockImplementation(() => {});
});

const observeClients = (store: RealtimeClientStore) => {
  const clients: Centrifuge[] = [];
  const record = () => {
    const client = store.api.client.get();

    if (client === null) {
      return;
    }

    if (clients.includes(client)) {
      return;
    }

    clients.push(client);
  };

  record();
  return { clients, stop: store.api.client.subscribe(record) };
};

test("client observation reports identity changes and stops independently of the session", () => {
  const store = new RealtimeClientStore();
  const { get, subscribe } = store.api.client;
  const observed: Array<Centrifuge | null> = [];
  const stopObserving = subscribe(() => observed.push(get()));
  expect(get()).toBeNull();
  expect(observed).toEqual([]);

  const stopFirst = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const first = get();
  expect(first).toBeInstanceOf(Centrifuge);
  const stopSecond = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const second = get();

  try {
    expect(second).toBeInstanceOf(Centrifuge);
    expect(second).not.toBe(first);
    expect(observed).toEqual([first, null, second]);
    stopFirst();
    expect(observed).toEqual([first, null, second]);

    stopObserving();
    stopObserving();
    expect(get()).toBe(second);
    stopSecond();
    expect(get()).toBeNull();
    expect(observed).toEqual([first, null, second]);
  } finally {
    stopObserving();
    stopSecond();
  }
});

test("subscription setup failure rolls back ownership so the channel can be retried", () => {
  const store = new RealtimeClientStore();
  const stop = store.session.set(createTestSessionConfiguration(configuration));
  const failure = new Error("subscription setup failed");
  vi.spyOn(Subscription.prototype, "subscribe").mockImplementationOnce(() => {
    throw failure;
  });

  try {
    expect(() =>
      store.api.channels
        .get("rooms:one")
        .events.subscribe("publication", () => {}),
    ).toThrow(failure);
    expect(store.api.client.get()?.subscriptions()).toEqual({});
    const unsubscribe = store.api.channels
      .get("rooms:one")
      .events.subscribe("publication", () => {});
    expect(Object.keys(store.api.client.get()?.subscriptions() ?? {})).toEqual([
      "rooms:one",
    ]);
    unsubscribe();
  } finally {
    stop();
  }
});

test("stale session cleanup and state events cannot affect the next session", () => {
  const store = new RealtimeClientStore();
  const stopFirst = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const previous = store.api.client.get();
  const stopSecond = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const current = store.api.client.get();

  stopFirst();
  previous?.emit("state", {
    oldState: State.Connecting,
    newState: State.Connected,
  });
  expect(store.api.client.get()).toBe(current);
  expect(store.api.connection.get()).toBe("disconnected");
  stopSecond();
  expect(store.api.client.get()).toBeNull();
});

test("identical callbacks retain independent subscriptions and cleanup is idempotent", () => {
  const store = new RealtimeClientStore();
  const handler = vi.fn();
  const first = store.api.channels
    .get("rooms:one")
    .events.subscribe("publication", handler);
  const second = store.api.channels
    .get("rooms:one")
    .events.subscribe("publication", handler);
  const stop = store.session.set(createTestSessionConfiguration(configuration));

  try {
    const subscription = store.api.client.get()?.getSubscription("rooms:one");
    subscription?.emit("publication", { channel: "rooms:one", data: 1 });
    expect(handler).toHaveBeenCalledTimes(2);
    first();
    first();
    subscription?.emit("publication", { channel: "rooms:one", data: 2 });
    expect(handler).toHaveBeenCalledTimes(3);
    second();
    expect(store.api.client.get()?.subscriptions()).toEqual({});
  } finally {
    stop();
  }
});

test("identical observable listeners have independent lifetimes", () => {
  const observable = new ValueStore(0);
  const listener = vi.fn();
  const unsubscribe = observable.subscribe(listener);
  const stop = observable.subscribe(listener);
  unsubscribe();
  observable.set(1);
  expect(listener).toHaveBeenCalledTimes(1);
  stop();
  observable.set(2);
  expect(listener).toHaveBeenCalledTimes(1);
});

test("channel listeners follow session changes and stop listening while the session is inactive", () => {
  const store = new RealtimeClientStore();
  const channel = store.api.channels.get("rooms:one");
  const onPublication = vi.fn();
  const onState = vi.fn();
  const stopPublications = channel.events.subscribe(
    "publication",
    onPublication,
  );
  const stopStates = channel.events.subscribe("state", onState);
  const first = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const firstClient = store.api.client.get();
  const firstSubscription = firstClient?.getSubscription("rooms:one");

  expect(onState).toHaveBeenCalledExactlyOnceWith({
    channel: "rooms:one",
    oldState: "unsubscribed",
    newState: "subscribing",
  });

  const second = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const secondClient = store.api.client.get();
  const secondSubscription = secondClient?.getSubscription("rooms:one");

  expect(firstClient?.subscriptions()).toEqual({});
  expect(firstSubscription?.listeners("publication")).toEqual([]);
  expect(firstSubscription?.listeners("state")).toEqual([]);
  expect(onState).toHaveBeenCalledTimes(2);
  firstSubscription?.emit("publication", { channel: "rooms:one", data: 1 });
  secondSubscription?.emit("publication", { channel: "rooms:one", data: 2 });
  expect(onPublication).toHaveBeenCalledExactlyOnceWith({
    channel: "rooms:one",
    data: 2,
  });

  first();
  expect(store.api.client.get()).toBe(secondClient);
  second();
  expect(secondClient?.subscriptions()).toEqual({});
  expect(channel.status.get()).toEqual({ state: "detached", error: null });
  stopPublications();

  const third = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const thirdClient = store.api.client.get();
  const thirdSubscription = thirdClient?.getSubscription("rooms:one");

  expect(onState).toHaveBeenCalledTimes(3);
  expect(thirdSubscription?.listeners("publication")).toEqual([]);
  stopStates();
  stopStates();
  expect(thirdClient?.subscriptions()).toEqual({});
  third();
});

test.each(["subscription", "connection"])(
  "a %s failure during session setup releases every acquired resource and allows retry",
  (stage) => {
    const store = new RealtimeClientStore();
    const firstChannel = store.api.channels.get("rooms:one");
    const secondChannel = store.api.channels.get("rooms:two");
    const handler = vi.fn();
    const stopFirst = firstChannel.events.subscribe("publication", handler);
    const stopSecond = secondChannel.events.subscribe("publication", handler);
    const { clients, stop: stopObserving } = observeClients(store);
    const failure = new Error("session setup failed");
    const failingConfiguration = createTestSessionConfiguration(
      stage === "subscription"
        ? {
            ...configuration,
            getSubscriptionOptions: (channel) => {
              if (channel === "rooms:two") {
                throw failure;
              }

              return {};
            },
          }
        : configuration,
    );

    if (stage === "connection") {
      vi.mocked(Centrifuge.prototype.connect).mockImplementationOnce(() => {
        throw failure;
      });
    }

    expect(() => store.session.set(failingConfiguration)).toThrow(failure);
    expect(clients).toHaveLength(1);
    expect(clients[0]?.subscriptions()).toEqual({});
    expect(store.api.client.get()).toBeNull();
    expect(store.api.connection.get()).toBe("disconnected");
    expect(firstChannel.status.get()).toEqual({
      state: "detached",
      error: null,
    });
    expect(secondChannel.status.get()).toEqual({
      state: "detached",
      error: null,
    });

    const stop = store.session.set(
      createTestSessionConfiguration(configuration),
    );
    const client = store.api.client.get();
    expect(Object.keys(client?.subscriptions() ?? {})).toEqual([
      "rooms:one",
      "rooms:two",
    ]);
    client?.getSubscription("rooms:one")?.emit("publication", {
      channel: "rooms:one",
      data: 1,
    });
    client?.getSubscription("rooms:two")?.emit("publication", {
      channel: "rooms:two",
      data: 2,
    });
    expect(handler).toHaveBeenCalledTimes(2);
    stopFirst();
    stopSecond();
    stop();
    stopObserving();
  },
);

test("channel handles remain reusable after cleanup without passive observers retaining subscriptions", () => {
  const store = new RealtimeClientStore();
  const channel = store.api.channels.get("rooms:one");
  const stop = store.session.set(createTestSessionConfiguration(configuration));
  const client = store.api.client.get();
  const stopObserving = channel.status.subscribe(() => {});

  expect(client?.subscriptions()).toEqual({});
  const first = channel.events.subscribe("publication", () => {});
  const firstSubscription = client?.getSubscription("rooms:one");
  expect(channel.status.get().state).toBe("subscribing");
  first();
  expect(client?.subscriptions()).toEqual({});
  expect(channel.status.get().state).toBe("detached");
  stopObserving();

  const second = channel.events.subscribe("publication", () => {});
  const secondSubscription = client?.getSubscription("rooms:one");
  expect(secondSubscription).not.toBe(firstSubscription);
  expect(channel.status.get().state).toBe("subscribing");
  first();
  stopObserving();
  expect(client?.getSubscription("rooms:one")).toBe(secondSubscription);
  second();
  expect(client?.subscriptions()).toEqual({});
  stop();
});

test("a status observer can resubscribe immediately after the previous subscription is released", () => {
  const store = new RealtimeClientStore();
  const channel = store.api.channels.get("rooms:one");
  const stop = store.session.set(createTestSessionConfiguration(configuration));
  const client = store.api.client.get();
  const first = channel.events.subscribe("publication", () => {});
  const previous = client?.getSubscription("rooms:one");
  const cleanups: Array<() => void> = [];
  const stopObserving = channel.status.subscribe(() => {
    if (channel.status.get().state !== "detached") {
      return;
    }

    cleanups.push(channel.events.subscribe("publication", () => {}));
  });

  first();

  expect(cleanups).toHaveLength(1);
  expect(client?.getSubscription("rooms:one")).not.toBe(previous);
  expect(channel.status.get().state).toBe("subscribing");
  stopObserving();
  cleanups.forEach((cleanup) => cleanup());
  stop();
});

test("client events bind before startup, follow sessions, and preserve native contexts", () => {
  const context = {
    client: "one",
    transport: "websocket",
    data: { user: "one" },
  };
  vi.mocked(Centrifuge.prototype.connect).mockImplementation(function (
    this: Centrifuge,
  ) {
    this.emit("connected", context);
  });
  const store = new RealtimeClientStore();
  const onConnected = vi.fn();
  const stopEvents = store.api.client.events.subscribe(
    "connected",
    onConnected,
  );
  const first = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const previous = store.api.client.get();

  expect(onConnected).toHaveBeenCalledExactlyOnceWith(context);
  expect(onConnected.mock.calls[0]?.[0]).toBe(context);

  const second = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const current = store.api.client.get();
  expect(onConnected).toHaveBeenCalledTimes(2);
  expect(previous?.listeners("connected")).toEqual([]);
  previous?.emit("connected", context);
  first();
  expect(onConnected).toHaveBeenCalledTimes(2);

  second();
  current?.emit("connected", context);
  expect(onConnected).toHaveBeenCalledTimes(2);
  const third = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  expect(onConnected).toHaveBeenCalledTimes(3);

  stopEvents();
  expect(store.api.client.get()?.listeners("connected")).toEqual([]);
  store.api.client.get()?.emit("connected", context);
  expect(onConnected).toHaveBeenCalledTimes(3);
  third();
});

test("connection snapshots read SDK state and stop notifying after session teardown", () => {
  const store = new RealtimeClientStore();
  const stop = store.session.set(createTestSessionConfiguration(configuration));
  const client = store.api.client.get();

  if (client === null) {
    throw new Error("Expected an active session");
  }

  client.state = State.Connected;
  expect(store.api.connection.get()).toBe("connected");
  const states: string[] = [];
  const stopObserving = store.api.connection.subscribe(() => {
    states.push(store.api.connection.get());
  });
  stop();

  expect(client.state).toBe(State.Disconnected);
  expect(states).toEqual(["disconnected"]);
  stopObserving();
});

test.each(["options", "state"])(
  "replacing the session from subscription %s keeps only the latest client and subscriptions",
  (trigger) => {
    const store = new RealtimeClientStore();
    const first = store.api.channels.get("rooms:one");
    const second = store.api.channels.get("rooms:two");
    const publication = vi.fn();
    const stopFirst = first.events.subscribe("publication", publication);
    const stopSecond = second.events.subscribe("publication", publication);
    const { clients, stop: stopObserving } = observeClients(store);
    let replace = true;
    let stopLatest = () => {};
    const replaceSession = () => {
      if (!replace) {
        return;
      }

      replace = false;
      stopLatest = store.session.set(
        createTestSessionConfiguration(configuration),
      );
    };
    const stopStates = first.status.subscribe(() => {
      if (trigger === "state" && first.status.get().state === "subscribing") {
        replaceSession();
      }
    });
    const initial = createTestSessionConfiguration(
      trigger === "options"
        ? {
            ...configuration,
            getSubscriptionOptions: () => {
              replaceSession();
              return {};
            },
          }
        : configuration,
    );

    const stopInitial = store.session.set(initial);

    try {
      const [previous, current] = clients;
      expect(clients).toHaveLength(2);
      expect(previous?.subscriptions()).toEqual({});
      expect(store.api.client.get()).toBe(current);
      expect(Object.keys(current?.subscriptions() ?? {})).toEqual([
        "rooms:one",
        "rooms:two",
      ]);
      expect(Centrifuge.prototype.connect).toHaveBeenCalledTimes(1);
      expect(vi.mocked(Centrifuge.prototype.connect).mock.instances[0]).toBe(
        current,
      );
      stopInitial();
      expect(store.api.client.get()).toBe(current);
      current?.getSubscription("rooms:two")?.emit("publication", {
        channel: "rooms:two",
        data: 1,
      });
      expect(publication).toHaveBeenCalledTimes(1);
    } finally {
      stopInitial();
      stopLatest();
      stopStates();
      stopFirst();
      stopSecond();
      stopObserving();
    }
  },
);

test("channel changes during session startup skip evicted channels and subscribe newly retained ones once", () => {
  const store = new RealtimeClientStore();
  const first = store.api.channels.get("rooms:one");
  const stopFirst = first.events.subscribe("publication", () => {});
  const stopSecond = store.api.channels
    .get("rooms:two")
    .events.subscribe("publication", () => {});
  let stopThird = () => {};
  const publication = vi.fn();
  const stopStates = first.status.subscribe(() => {
    if (first.status.get().state !== "subscribing") {
      return;
    }

    stopSecond();
    stopThird = store.api.channels
      .get("rooms:three")
      .events.subscribe("publication", publication);
  });
  const stopSession = store.session.set(
    createTestSessionConfiguration(configuration),
  );

  try {
    const client = store.api.client.get();
    expect(Object.keys(client?.subscriptions() ?? {})).toEqual([
      "rooms:one",
      "rooms:three",
    ]);
    client?.getSubscription("rooms:three")?.emit("publication", {
      channel: "rooms:three",
      data: 1,
    });
    expect(publication).toHaveBeenCalledTimes(1);
  } finally {
    stopSession();
    stopFirst();
    stopSecond();
    stopThird();
    stopStates();
  }
});

test.each(["before", "after"])(
  "session replacement from a cleanup registered %s channels preserves all bridges",
  (timing) => {
    const store = new RealtimeClientStore();
    let replace = true;
    let stopLatest = () => {};
    const registerObserver = () => {
      const register = () => {
        const session = store.session.get();

        if (session === null) {
          return;
        }

        session.scope.addCleanup(() => {
          if (!replace) {
            return;
          }

          replace = false;
          stopLatest = store.session.set(
            createTestSessionConfiguration(configuration),
          );
        });
      };

      register();
      return store.session.subscribe(register);
    };
    const stopObserverBefore =
      timing === "before" ? registerObserver() : () => {};
    const onPublication = vi.fn();
    const onConnected = vi.fn();
    const channel = store.api.channels.get("rooms:one");
    const stopPublications = channel.events.subscribe(
      "publication",
      onPublication,
    );
    const stopConnected = store.api.client.events.subscribe(
      "connected",
      onConnected,
    );
    const stopFirst = store.session.set(
      createTestSessionConfiguration(configuration),
    );
    const previous = store.api.client.get();
    const stopObserverAfter =
      timing === "after" ? registerObserver() : () => {};
    const stopPending = store.session.set(
      createTestSessionConfiguration(configuration),
    );
    const latest = store.api.client.get();

    expect(latest).not.toBe(previous);
    expect(Centrifuge.prototype.connect).toHaveBeenCalledTimes(2);
    expect(previous?.subscriptions()).toEqual({});
    expect(previous?.listeners("connected")).toEqual([]);
    expect(latest?.getSubscription("rooms:one")).not.toBeNull();
    latest
      ?.getSubscription("rooms:one")
      ?.emit("publication", { channel: "rooms:one", data: 1 });
    latest?.emit("connected", { client: "latest", transport: "websocket" });
    expect(onPublication).toHaveBeenCalledTimes(1);
    expect(onConnected).toHaveBeenCalledTimes(1);
    stopPending();
    stopFirst();
    expect(store.api.client.get()).toBe(latest);
    stopObserverBefore();
    stopObserverAfter();
    stopPublications();
    stopConnected();
    stopLatest();
  },
);

test("many consumers share a single native bridge per event across session replacements", () => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const store = new RealtimeClientStore();
  const handler = vi.fn();
  const channel = store.api.channels.get("rooms:one");
  const cleanups = Array.from({ length: 25 }, () =>
    channel.events.subscribe("publication", handler),
  );
  const stateCleanups = Array.from({ length: 25 }, () =>
    channel.events.subscribe("state", () => {}),
  );
  const clientCleanups = Array.from({ length: 25 }, () =>
    store.api.client.events.subscribe("connected", () => {}),
  );
  const first = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const previous = store.api.client.get()?.getSubscription("rooms:one");
  const second = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const client = store.api.client.get();
  const subscription = client?.getSubscription("rooms:one");
  expect(subscription?.listeners("publication").length).toBe(1);
  expect(subscription?.listeners("state").length).toBe(1);
  expect(client?.listeners("connected").length).toBe(1);
  expect(previous?.listeners("publication").length).toBe(0);
  subscription?.emit("publication", { channel: "rooms:one", data: 1 });
  expect(handler).toHaveBeenCalledTimes(25);
  expect(warning).not.toHaveBeenCalled();
  cleanups.forEach((stop) => stop());
  expect(subscription?.listeners("publication").length).toBe(0);
  stateCleanups.forEach((stop) => stop());
  clientCleanups.forEach((stop) => stop());
  expect(client?.subscriptions()).toEqual({});
  first();
  second();
});

test.each(["listener", "channel", "session"])(
  "ending a %s during publication dispatch skips later consumers",
  (target) => {
    const store = new RealtimeClientStore();
    const channel = store.api.channels.get("rooms:one");
    const handler = vi.fn();
    const stopFirst = channel.events.subscribe("publication", () => {
      if (target === "session") {
        stopSession();
        return;
      }

      stopSecond();
      if (target === "channel") {
        stopFirst();
      }
    });
    const stopSecond = channel.events.subscribe("publication", handler);
    const stopSession = store.session.set(
      createTestSessionConfiguration(configuration),
    );
    const subscription = store.api.client.get()?.getSubscription("rooms:one");
    subscription?.emit("publication", { channel: "rooms:one", data: 1 });
    expect(handler).not.toHaveBeenCalled();
    stopFirst();
    stopSecond();
    stopSession();
  },
);

test("a session ended by subscription options allocates no native subscription", () => {
  const store = new RealtimeClientStore();
  const options = createTestSessionConfiguration({
    ...configuration,
    getSubscriptionOptions: () => {
      stopSession();
      return {};
    },
  });
  const stopSession = store.session.set(options);
  const createNative = vi.spyOn(Centrifuge.prototype, "newSubscription");
  const stop = store.api.channels
    .get("rooms:one")
    .events.subscribe("publication", () => {});
  expect(createNative).not.toHaveBeenCalled();
  expect(store.api.client.get()).toBeNull();
  stop();
});

test("ending a session while binding native events removes the subscription before startup", () => {
  const store = new RealtimeClientStore();
  const stopSession = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const client = store.api.client.get();
  const subscribe = vi.spyOn(Subscription.prototype, "subscribe");
  const on = Subscription.prototype.on;
  vi.spyOn(Subscription.prototype, "on").mockImplementationOnce(function (
    this: Subscription,
    event,
    listener,
  ) {
    on.call(this, event, listener);
    stopSession();
    return this;
  });
  const stop = store.api.channels
    .get("rooms:one")
    .events.subscribe("publication", () => {});
  expect(subscribe).not.toHaveBeenCalled();
  expect(client?.subscriptions()).toEqual({});
  stop();
});

test("session get, set, and subscribe remain bound and expose only the active session", () => {
  const store = new RealtimeClientStore();
  const { get, set, subscribe } = store.session;
  const sessions: Array<ReturnType<typeof get>> = [];
  const stopObserving = subscribe(() => sessions.push(get()));
  const readsDuringCleanup: Array<ReturnType<typeof get>> = [];
  const stopClientObserver = subscribe(() => {
    const session = get();

    if (session === null) {
      return;
    }

    session.scope.addCleanup(() => {
      readsDuringCleanup.push(get());
    });
  });
  const options = createTestSessionConfiguration(configuration);
  expect(get()).toBeNull();
  expect(sessions).toEqual([]);
  const stopFirst = set(options);
  const first = get();
  const stopSecond = set(options);
  const second = get();

  expect(second).not.toBe(first);
  expect(second?.id).not.toBe(first?.id);
  expect(second?.configuration).toBe(options);
  expect(second?.client).toBe(store.api.client.get());
  stopFirst();
  stopFirst();
  expect(get()).toBe(second);
  stopSecond();
  expect(sessions).toEqual([first, null, second, null]);
  expect(readsDuringCleanup).toEqual([null, null]);
  expect(store.api).not.toHaveProperty("session");
  expect(store.api.client).not.toHaveProperty("set");
  expect(store.api.connection).not.toHaveProperty("set");
  stopObserving();
  stopClientObserver();
});

test.each([false, true])(
  "a newer session prepared from options supersedes the pending attempt even when ended: %s",
  (endLatest) => {
    const store = new RealtimeClientStore();
    const pendingConfiguration: CentrifugeConfiguration = { ...configuration };
    const pending = createTestSessionConfiguration(pendingConfiguration);
    let stopLatest = () => {};
    let latest: ReturnType<typeof store.session.get> = null;
    Object.defineProperty(pendingConfiguration, "options", {
      get: () => {
        stopLatest = store.session.set(
          createTestSessionConfiguration(configuration),
        );
        latest = store.session.get();

        if (endLatest) {
          stopLatest();
        }

        return undefined;
      },
    });

    const stopPending = store.session.set(pending);
    expect(Centrifuge.prototype.connect).toHaveBeenCalledTimes(1);
    expect(store.session.get()).toBe(endLatest ? null : latest);
    stopPending();
    expect(store.session.get()).toBe(endLatest ? null : latest);
    stopLatest();
    expect(store.session.get()).toBeNull();
  },
);

test.each(["configuration", "options", "option property", "transport"])(
  "replacement during %s preparation stops before constructing the obsolete client",
  (trigger) => {
    const store = new RealtimeClientStore();
    const pending: CentrifugeConfiguration = {
      ...configuration,
      transport: "",
    };
    let stopLatest = () => {};
    let stopPending = () => {};
    let latest: ReturnType<typeof store.session.get> = null;
    const replace = () => {
      stopLatest = store.session.set(
        createTestSessionConfiguration(configuration),
      );
      latest = store.session.get();
    };
    const readTransport = vi.fn(() => {
      if (trigger === "transport") {
        replace();
      }

      return "";
    });
    Object.defineProperty(pending, "transport", { get: readTransport });

    if (trigger === "options") {
      Object.defineProperty(pending, "options", {
        get: () => {
          replace();
          return undefined;
        },
      });
    }

    if (trigger === "option property") {
      pending.options = {
        get token() {
          replace();
          return "obsolete";
        },
      };
    }

    try {
      expect(() => {
        stopPending = store.session.set({
          get: () => {
            if (trigger === "configuration") {
              replace();
            }

            return pending;
          },
        });
      }).not.toThrow();

      expect(latest).not.toBeNull();
      expect(store.session.get()).toBe(latest);
      expect(Centrifuge.prototype.connect).toHaveBeenCalledTimes(1);
      expect(readTransport).toHaveBeenCalledTimes(
        trigger === "transport" ? 1 : 0,
      );
      stopPending();
      expect(store.session.get()).toBe(latest);
    } finally {
      stopPending();
      stopLatest();
    }
  },
);

test("failed event registration releases only its own demand and stale cleanup cannot release a new registration", () => {
  const store = new RealtimeClientStore();
  const stopSession = store.session.set(
    createTestSessionConfiguration(configuration),
  );
  const channel = store.api.channels.get("rooms:one");
  const observe = vi.fn();
  const stopStatus = channel.status.subscribe(observe);
  const stopSecondStatus = channel.status.subscribe(observe);
  const onPublication = vi.fn();
  const stopPublication = channel.events.subscribe(
    "publication",
    onPublication,
  );
  const subscription = store.api.client.get()?.getSubscription("rooms:one");
  const failure = new Error("join registration failed");
  vi.spyOn(Subscription.prototype, "on").mockImplementationOnce(() => {
    throw failure;
  });
  expect(() => channel.events.subscribe("join", () => {})).toThrow(failure);
  subscription?.emit("publication", { channel: "rooms:one", data: 1 });
  expect(onPublication).toHaveBeenCalledTimes(1);
  expect(store.api.client.get()?.getSubscription("rooms:one")).toBe(
    subscription,
  );

  stopStatus();
  stopStatus();
  stopPublication();
  expect(store.api.client.get()?.subscriptions()).toEqual({});
  expect(channel.status.get().state).toBe("detached");
  expect(observe).toHaveBeenCalledTimes(3);
  stopSecondStatus();

  const stopNewPublication = channel.events.subscribe(
    "publication",
    onPublication,
  );
  const current = store.api.client.get()?.getSubscription("rooms:one");
  expect(current).not.toBe(subscription);
  stopPublication();
  stopStatus();
  stopSecondStatus();
  expect(store.api.client.get()?.getSubscription("rooms:one")).toBe(current);
  current?.emit("publication", { channel: "rooms:one", data: 2 });
  expect(onPublication).toHaveBeenCalledTimes(2);
  stopNewPublication();
  expect(store.api.client.get()?.subscriptions()).toEqual({});
  stopSession();
});

test.each([false, true])(
  "failed preparation leaves one inactive session without duplicate notifications; replacing: %s",
  (replaceExisting) => {
    const store = new RealtimeClientStore();
    const failingConfiguration: CentrifugeConfiguration = { ...configuration };
    const options = createTestSessionConfiguration(failingConfiguration);
    const failure = new Error("invalid connection options");
    const clientReads: Array<Centrifuge | null> = [];
    const recordClient = () => clientReads.push(store.api.client.get());
    recordClient();
    const stopObserving = store.session.subscribe(recordClient);
    const stopPublications = store.api.channels
      .get("rooms:one")
      .events.subscribe("publication", () => {});
    const stopPrevious = replaceExisting
      ? store.session.set(createTestSessionConfiguration(configuration))
      : () => {};
    const previous = store.session.get();
    Object.defineProperty(failingConfiguration, "options", {
      get: () => {
        expect(store.session.get()).toBeNull();

        if (previous !== null) {
          expect(previous.scope.isActive()).toBe(false);
          expect(previous.client.subscriptions()).toEqual({});
        }

        throw failure;
      },
    });

    expect(() => store.session.set(options)).toThrow(failure);
    expect(store.session.get()).toBeNull();
    expect(clientReads).toEqual(
      replaceExisting ? [null, previous?.client, null] : [null],
    );

    const stopCurrent = store.session.set(
      createTestSessionConfiguration(configuration),
    );
    const current = store.session.get();
    expect(current?.client.getSubscription("rooms:one")).not.toBeNull();
    stopPrevious();
    expect(store.session.get()).toBe(current);
    stopCurrent();
    stopPublications();
    stopObserving();
  },
);
