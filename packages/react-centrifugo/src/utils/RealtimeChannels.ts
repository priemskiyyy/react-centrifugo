import type {
  Centrifuge,
  SubscriptionEvents,
  SubscriptionOptions,
} from "centrifuge";
import type { RealtimeChannelView } from "src/types/internal/RealtimeChannelView";
import type { ChannelStatus } from "src/types/ChannelStatus";
import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";
import { DETACHED_CHANNEL_STATUS } from "src/utils/constants/realtimeChannel";
import { EventListeners } from "src/utils/internal/EventListeners";
import { ResourceScope } from "src/utils/internal/ResourceScope";
import { ValueStore } from "src/utils/internal/ValueStore";
import { createScopedCallback } from "src/utils/internal/createScopedCallback";
import type { Diagnostics } from "src/utils/internal/Diagnostics";
import type { RealtimeSnapshot } from "src/types/RealtimeDiagnostics";

type ChannelSession = {
  id: symbol;
  client: Pick<Centrifuge, "newSubscription" | "removeSubscription">;
  configuration: {
    get: () => Pick<CentrifugeConfiguration, "getSubscriptionOptions">;
  };
  scope: { adopt: (child: ResourceScope) => void };
};

type SessionSource = {
  get: () => ChannelSession | null;
};

type Channel = {
  name: string;
  events: EventListeners<SubscriptionEvents>;
  status: ValueStore<ChannelStatus>;
  consumers: { events: Set<symbol>; status: Set<symbol> };
  attachment: { scope: ResourceScope; sessionId: symbol } | null;
};

const createChannelStatus = (events: EventListeners<SubscriptionEvents>) => {
  const status = new ValueStore<ChannelStatus>(DETACHED_CHANNEL_STATUS);

  events.subscribe("state", ({ newState }) => {
    if (newState === "subscribed") {
      status.set({ state: newState, error: null });
      return;
    }

    status.set({ state: newState, error: status.get().error });
  });

  events.subscribe("error", (error) => {
    status.set({ ...status.get(), error });
  });

  return status;
};

export class RealtimeChannels {
  #channels = new Map<string, Channel>();
  #session: SessionSource;
  #diagnostics: Diagnostics;

  constructor(session: SessionSource, diagnostics: Diagnostics) {
    this.#session = session;
    this.#diagnostics = diagnostics;
  }

  inspect = (): RealtimeSnapshot["channels"] =>
    [...this.#channels.values()].map((channel) => {
      const { state, error } = channel.status.get();

      return {
        name: channel.name,
        state,
        error:
          error === null
            ? null
            : { code: error.error.code, message: error.error.message },
        consumers: {
          events: channel.consumers.events.size,
          status: channel.consumers.status.size,
        },
      };
    });

  get = (name: string): RealtimeChannelView => ({
    events: {
      subscribe: (event, handler) =>
        this.#registerConsumer(name, "events", (channel) =>
          channel.events.subscribe(event, handler),
        ),
    },
    status: {
      get: () => {
        const channel = this.#channels.get(name);

        if (channel === undefined) {
          return DETACHED_CHANNEL_STATUS;
        }

        return channel.status.get();
      },
      subscribe: (listener) =>
        this.#registerConsumer(name, "status", (channel) =>
          channel.status.subscribe(listener),
        ),
    },
  });

  subscribeAll = () => {
    for (const channel of [...this.#channels.values()]) {
      // Earlier acquisitions can remove entries from this snapshot.
      if (this.#channels.get(channel.name) !== channel) {
        continue;
      }

      this.#subscribe(channel);
    }
  };

  #registerConsumer = (
    name: string,
    consumerType: keyof Channel["consumers"],
    subscribe: (channel: Channel) => () => void,
  ) => {
    const channel = this.#getOrCreateChannel(name);
    const consumer = new ResourceScope();
    const consumerId = Symbol("channel consumer");
    const consumers = channel.consumers[consumerType];
    consumers.add(consumerId);
    this.#diagnostics.changed();

    consumer.addCleanup(() => {
      consumers.delete(consumerId);
      this.#diagnostics.changed();

      // Native demand comes from event consumers only; status observers just watch.
      if (channel.consumers.events.size > 0) {
        return;
      }

      if (channel.consumers.status.size === 0) {
        this.#channels.delete(name);
        this.#diagnostics.record("runtime", "channel.removed", {}, name);
      }

      if (channel.attachment === null) {
        return;
      }

      channel.attachment.scope.dispose();
    });

    return consumer.setup(() => {
      consumer.addCleanup(subscribe(channel));
      this.#subscribe(channel);
      return consumer.dispose;
    });
  };

  #getOrCreateChannel = (name: string): Channel => {
    const existing = this.#channels.get(name);

    if (existing !== undefined) {
      return existing;
    }

    const events = new EventListeners<SubscriptionEvents>();
    const channel: Channel = {
      name,
      events,
      status: createChannelStatus(events),
      consumers: { events: new Set(), status: new Set() },
      attachment: null,
    };
    this.#channels.set(name, channel);
    channel.status.subscribe(this.#diagnostics.changed);
    this.#diagnostics.changed();
    this.#diagnostics.record("runtime", "channel.added", {}, name);
    return channel;
  };

  #subscribe = (channel: Channel) => {
    if (channel.consumers.events.size === 0) {
      return;
    }

    const session = this.#session.get();

    if (session === null) {
      return;
    }

    if (channel.attachment !== null) {
      if (channel.attachment.sessionId === session.id) {
        return;
      }

      // Cleanup can replace the session or remove the last consumer.
      channel.attachment.scope.dispose();
    }

    if (!this.#isAttachable(channel, session)) {
      return;
    }

    this.#attach(channel, session);
  };

  #isAttachable = (channel: Channel, session: ChannelSession) => {
    if (channel.consumers.events.size === 0) {
      return false;
    }

    if (channel.attachment !== null) {
      return false;
    }

    const current = this.#session.get();

    if (current === null) {
      return false;
    }

    return current.id === session.id;
  };

  #attach = (channel: Channel, session: ChannelSession) => {
    // Reserve the channel before options or SDK callbacks can acquire it again.
    const scope = new ResourceScope();
    channel.attachment = { scope, sessionId: session.id };
    scope.addCleanup(() => {
      if (channel.attachment === null) {
        return;
      }

      if (channel.attachment.scope !== scope) {
        return;
      }

      channel.attachment = null;
      channel.status.set(DETACHED_CHANNEL_STATUS);
      this.#diagnostics.record(
        "runtime",
        "subscription.detached",
        {},
        channel.name,
      );
    });
    session.scope.adopt(scope);

    scope.setup(() => {
      const { client, configuration } = session;
      const options = this.#getSubscriptionOptions(
        channel.name,
        configuration,
        scope,
      );

      if (!scope.isActive()) {
        return;
      }

      const subscription = client.newSubscription(channel.name, options);
      scope.addCleanup(() => {
        subscription.removeAllListeners();
        client.removeSubscription(subscription);
      });
      this.#diagnostics.observe<SubscriptionEvents>(
        subscription,
        [
          "subscribing",
          "subscribed",
          "unsubscribed",
          "error",
          "publication",
          "join",
          "leave",
        ],
        scope,
        channel.name,
      );
      channel.events.bind(subscription, scope);

      if (!scope.isActive()) {
        return;
      }

      subscription.subscribe();
    });
  };

  #getSubscriptionOptions = (
    channel: string,
    configuration: ChannelSession["configuration"],
    scope: ResourceScope,
  ): SubscriptionOptions => {
    const getLatestOptions = () => {
      const { getSubscriptionOptions } = configuration.get();

      if (typeof getSubscriptionOptions !== "function") {
        return;
      }

      return getSubscriptionOptions(channel);
    };

    const current = getLatestOptions();

    if (current === undefined) {
      return {};
    }

    const options = { ...current };

    // Presence is fixed when the subscription is created; each call reads the latest.
    if (typeof options.getToken === "function") {
      options.getToken = createScopedCallback((context) => {
        const latest = getLatestOptions();

        if (latest === undefined) {
          return;
        }

        if (typeof latest.getToken !== "function") {
          return;
        }

        return latest.getToken(context);
      }, scope.isActive);
    }

    if (typeof options.getData === "function") {
      options.getData = createScopedCallback((context) => {
        const latest = getLatestOptions();

        if (latest === undefined) {
          return;
        }

        if (typeof latest.getData !== "function") {
          return;
        }

        return latest.getData(context);
      }, scope.isActive);
    }

    return options;
  };
}
