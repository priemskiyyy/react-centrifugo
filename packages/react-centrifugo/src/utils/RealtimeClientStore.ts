import { Centrifuge } from "centrifuge";
import type { ClientEvents } from "centrifuge";
import type { ConfigurationSource } from "src/types/internal/ConfigurationSource";
import type { RealtimeStoreApi } from "src/types/internal/RealtimeStoreApi";
import { RealtimeChannels } from "src/utils/RealtimeChannels";
import { EventListeners } from "src/utils/internal/EventListeners";
import { ResourceScope } from "src/utils/internal/ResourceScope";
import { ValueStore } from "src/utils/internal/ValueStore";
import { notifyOnChange } from "src/utils/internal/notifyOnChange";
import { getConnectionOptions } from "src/utils/internal/getConnectionOptions";
import { Diagnostics } from "src/utils/internal/Diagnostics";

type SessionState =
  | {
      id: symbol;
      name: string;
      client: Centrifuge;
      configuration: ConfigurationSource;
      scope: ResourceScope;
    }
  | {
      client: null;
      scope: ResourceScope;
    };

export class RealtimeClientStore {
  #events = new EventListeners<ClientEvents>();
  #diagnostics: Diagnostics = new Diagnostics(() => {
    const session = this.session.get();

    return {
      session: session === null ? null : { id: session.name },
      connection: this.api.connection.get(),
      channels: this.#channels.inspect(),
    };
  });

  session = this.#createSession();

  #channels = new RealtimeChannels(this.session, this.#diagnostics);

  api: RealtimeStoreApi = {
    diagnostics: this.#diagnostics.api,
    client: {
      get: () => {
        const session = this.session.get();

        if (session === null) {
          return null;
        }

        return session.client;
      },
      subscribe: this.session.subscribe,
      events: { subscribe: this.#events.subscribe },
    },
    connection: {
      get: () => {
        const session = this.session.get();

        if (session === null) {
          return "disconnected";
        }

        return session.client.state;
      },
      subscribe: (listener) => {
        const notify = notifyOnChange(this.api.connection.get, listener);
        const scope = new ResourceScope();

        return scope.setup(() => {
          scope.addCleanup(this.session.subscribe(notify));
          scope.addCleanup(this.#events.subscribe("state", notify));
          return scope.dispose;
        });
      },
    },
    channels: { get: this.#channels.get },
  };

  #createSession() {
    const state = new ValueStore<SessionState | null>(null);
    state.subscribe(this.#diagnostics.changed);
    this.#events.subscribe("state", this.#diagnostics.changed);

    const session = {
      get: () => {
        const session = state.get();

        if (session === null) {
          return null;
        }

        if (session.client === null) {
          return null;
        }

        if (!session.scope.isActive()) {
          return null;
        }

        return session;
      },

      subscribe: (listener: () => void) =>
        state.subscribe(notifyOnChange(session.get, listener)),

      set: (configuration: ConfigurationSource) => {
        const previous = state.get();
        const scope = new ResourceScope();
        scope.addCleanup(() => {
          const current = state.get();

          if (current === null) {
            return;
          }

          if (current.scope !== scope) {
            return;
          }

          state.set(null);
        });

        // Reserve this replacement before callbacks can start another session.
        state.set({ client: null, scope });

        // Configuration getters and SDK callbacks can replace this session synchronously.
        return scope.setup(() => {
          if (previous !== null) {
            previous.scope.dispose();
          }

          if (!scope.isActive()) {
            return scope.dispose;
          }

          const initial = configuration.get();
          const name = initial.session.id;

          if (!scope.isActive()) {
            return scope.dispose;
          }

          const options = getConnectionOptions(
            initial.options,
            configuration,
            scope,
          );

          if (!scope.isActive()) {
            return scope.dispose;
          }

          const transport = initial.transport;

          if (!scope.isActive()) {
            return scope.dispose;
          }

          const client = new Centrifuge(transport, options);
          scope.addCleanup(() => client.disconnect());

          this.#diagnostics.observe<ClientEvents>(
            client,
            [
              "connecting",
              "connected",
              "disconnected",
              "error",
              "publication",
              "subscribed",
              "subscribing",
              "unsubscribed",
              "join",
              "leave",
            ],
            scope,
          );

          this.#events.bind(client, scope);

          if (!scope.isActive()) {
            return scope.dispose;
          }

          state.set({
            id: Symbol("realtime session"),
            name,
            client,
            configuration,
            scope,
          });
          this.#diagnostics.record("runtime", "session.started", { id: name });
          scope.addCleanup(() =>
            this.#diagnostics.record("runtime", "session.ended", { id: name }),
          );

          if (!scope.isActive()) {
            return scope.dispose;
          }

          this.#channels.subscribeAll();

          if (!scope.isActive()) {
            return scope.dispose;
          }

          client.connect();
          return scope.dispose;
        });
      },
    };

    return session;
  }
}
