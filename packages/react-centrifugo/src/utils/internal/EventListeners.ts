import type { EventMap } from "centrifuge";
import type { EventListenerView } from "src/types/internal/EventListenerView";
import type { RealtimeEventHandler } from "src/types/internal/RealtimeEventHandler";
import { ResourceScope } from "src/utils/internal/ResourceScope";
import { invokeIsolated } from "src/utils/internal/invokeIsolated";

type EventEmitter<TEvents extends EventMap> = {
  on: <TEvent extends keyof TEvents>(
    event: TEvent,
    listener: (context: Parameters<TEvents[TEvent]>[0]) => void,
  ) => unknown;
  off: EventEmitter<TEvents>["on"];
};

type ListenerGroup<TContext> = {
  listeners: Set<{ handle: RealtimeEventHandler<TContext> }>;
  bridge: { scope: ResourceScope; sourceId: symbol } | null;
  bind: () => void;
};

/** Consumer registrations stay here; only their native bridges follow the source. */
export class EventListeners<
  TEvents extends EventMap,
> implements EventListenerView<TEvents> {
  #groups: {
    [TEvent in keyof TEvents]?: ListenerGroup<Parameters<TEvents[TEvent]>[0]>;
  } = {};
  #source: {
    id: symbol;
    emitter: EventEmitter<TEvents>;
    scope: ResourceScope;
  } | null = null;

  subscribe: EventListenerView<TEvents>["subscribe"] = (event, handle) => {
    const group = this.#getOrCreateGroup(event);
    const listener = { handle };
    group.listeners.add(listener);

    const unsubscribe = () => {
      if (!group.listeners.delete(listener)) {
        return;
      }

      if (group.listeners.size > 0) {
        return;
      }

      delete this.#groups[event];

      if (group.bridge === null) {
        return;
      }

      group.bridge.scope.dispose();
    };

    try {
      group.bind();
      return unsubscribe;
    } catch (error) {
      unsubscribe();
      throw error;
    }
  };

  bind = (emitter: EventEmitter<TEvents>, scope: ResourceScope) => {
    if (!scope.isActive()) {
      return;
    }

    if (
      this.#source === null ||
      this.#source.emitter !== emitter ||
      this.#source.scope !== scope
    ) {
      const id = Symbol("event binding");
      this.#source = { id, emitter, scope };
      scope.addCleanup(() => {
        if (this.#source === null) {
          return;
        }

        if (this.#source.id !== id) {
          return;
        }

        this.#source = null;
      });
    }

    const source = this.#source;

    for (const group of Object.values<{ bind: () => void } | undefined>(
      this.#groups,
    )) {
      if (!this.#isCurrentSource(source)) {
        return;
      }

      if (group === undefined) {
        continue;
      }

      group.bind();
    }
  };

  #isCurrentSource = (source: { id: symbol; scope: ResourceScope }) => {
    if (!source.scope.isActive()) {
      return false;
    }

    if (this.#source === null) {
      return false;
    }

    return this.#source.id === source.id;
  };

  #getOrCreateGroup = <TEvent extends keyof TEvents>(event: TEvent) => {
    const existing = this.#groups[event];

    if (existing !== undefined) {
      return existing;
    }

    const group: ListenerGroup<Parameters<TEvents[TEvent]>[0]> = {
      listeners: new Set(),
      bridge: null,
      bind: () => this.#bindGroup(event, group),
    };

    this.#groups[event] = group;
    return group;
  };

  #bindGroup = <TEvent extends keyof TEvents>(
    event: TEvent,
    group: ListenerGroup<Parameters<TEvents[TEvent]>[0]>,
  ) => {
    const source = this.#source;

    if (source === null) {
      return;
    }

    if (!source.scope.isActive()) {
      return;
    }

    if (group.listeners.size === 0) {
      return;
    }

    const previous = group.bridge;

    if (previous !== null) {
      if (previous.sourceId === source.id) {
        return;
      }
    }

    const bridge = new ResourceScope();
    // Reserve the bridge before native cleanup can reenter binding.
    group.bridge = { scope: bridge, sourceId: source.id };
    bridge.addCleanup(() => {
      if (group.bridge === null) {
        return;
      }

      if (group.bridge.scope !== bridge) {
        return;
      }

      group.bridge = null;
    });
    source.scope.adopt(bridge);

    const dispatch = (context: Parameters<TEvents[TEvent]>[0]) => {
      for (const listener of [...group.listeners]) {
        if (!bridge.isActive()) {
          return;
        }

        if (!this.#isCurrentSource(source)) {
          return;
        }

        if (!group.listeners.has(listener)) {
          continue;
        }

        invokeIsolated(() => listener.handle(context));
      }
    };

    bridge.setup(() => {
      if (previous !== null) {
        previous.scope.dispose();
      }

      if (!bridge.isActive()) {
        return bridge.dispose();
      }

      if (!this.#isCurrentSource(source)) {
        return bridge.dispose();
      }

      try {
        source.emitter.on(event, dispatch);
      } finally {
        bridge.addCleanup(() => source.emitter.off(event, dispatch));
      }
    });
  };
}
