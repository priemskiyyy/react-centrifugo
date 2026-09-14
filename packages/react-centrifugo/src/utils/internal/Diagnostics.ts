import type { EventMap } from "centrifuge";
import type {
  RealtimeDiagnostics,
  RealtimeDiagnosticEvent,
  RealtimeSnapshot,
} from "src/types/RealtimeDiagnostics";
import { ResourceScope } from "src/utils/internal/ResourceScope";
import { ValueStore } from "src/utils/internal/ValueStore";
import { invokeIsolated } from "src/utils/internal/invokeIsolated";

type EventSource<TEvents extends EventMap> = {
  on: <TEvent extends keyof TEvents>(
    event: TEvent,
    listener: (context: Parameters<TEvents[TEvent]>[0]) => void,
  ) => unknown;
  off: EventSource<TEvents>["on"];
};

export class Diagnostics {
  #read: () => RealtimeSnapshot;
  #snapshot: RealtimeSnapshot | undefined;
  #listeners = new Set<() => void>();
  #eventListeners = new Set<(event: RealtimeDiagnosticEvent) => void>();
  #recording = new ValueStore(false);
  #scheduled = false;

  constructor(read: () => RealtimeSnapshot) {
    this.#read = read;
  }

  api: RealtimeDiagnostics = {
    get: () => {
      if (this.#snapshot === undefined) {
        this.#snapshot = this.#read();
      }

      return this.#snapshot;
    },
    subscribe: (listener) => {
      const notify = () => listener();
      this.#listeners.add(notify);
      return () => {
        this.#listeners.delete(notify);
      };
    },
    events: {
      subscribe: (listener) => {
        const handle = (event: RealtimeDiagnosticEvent) => listener(event);
        this.#eventListeners.add(handle);
        this.#recording.set(true);

        return () => {
          this.#eventListeners.delete(handle);
          this.#recording.set(this.#eventListeners.size > 0);
        };
      },
    },
  };

  changed = () => {
    this.#snapshot = undefined;

    if (this.#listeners.size === 0) {
      return;
    }

    if (this.#scheduled) {
      return;
    }

    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;

      for (const listener of [...this.#listeners]) {
        if (!this.#listeners.has(listener)) {
          continue;
        }

        invokeIsolated(listener);
      }
    });
  };

  record = (
    source: RealtimeDiagnosticEvent["source"],
    type: string,
    context: unknown,
    channel: string | null = null,
  ) => {
    if (this.#eventListeners.size === 0) {
      return;
    }

    const event = { source, type, context, channel, timestamp: Date.now() };

    for (const listener of [...this.#eventListeners]) {
      if (!this.#eventListeners.has(listener)) {
        continue;
      }

      invokeIsolated(() => listener(event));
    }
  };

  observe = <TEvents extends EventMap>(
    emitter: EventSource<TEvents>,
    events: Array<keyof TEvents & string>,
    scope: ResourceScope,
    channel: string | null = null,
  ) => {
    let observation: ResourceScope | null = null;
    const stop = () => {
      if (observation === null) {
        return;
      }

      const previous = observation;
      observation = null;
      previous.dispose();
    };
    const update = () => {
      stop();

      if (!scope.isActive()) {
        return;
      }

      if (!this.#recording.get()) {
        return;
      }

      const active = new ResourceScope();
      observation = active;
      active.setup(() => {
        for (const event of events) {
          if (!active.isActive()) {
            return;
          }

          if (!scope.isActive()) {
            return;
          }

          const handle = (context: unknown) => {
            if (!active.isActive()) {
              return;
            }

            if (!scope.isActive()) {
              return;
            }

            this.record(
              channel === null ? "client" : "channel",
              event,
              context,
              channel,
            );
          };
          try {
            emitter.on(event, handle);
          } finally {
            active.addCleanup(() => emitter.off(event, handle));
          }
        }
      });
    };

    scope.addCleanup(this.#recording.subscribe(update));
    scope.addCleanup(stop);
    update();
  };
}
