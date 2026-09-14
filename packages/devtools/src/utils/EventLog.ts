import type { RealtimeDiagnosticEvent } from "react-centrifugo/devtools";
import { describeContext } from "src/utils/describeContext";
import type { RecordedEventKind } from "src/utils/getEventKind";

export type RecordedEvent = Omit<RealtimeDiagnosticEvent, "context"> & {
  id: number;
  context: string;
  summary: string;
  kind: RecordedEventKind;
};

// Clamp instead of throwing. A bad prop must not crash the host application.
const clampLimit = (limit: number) =>
  Number.isNaN(limit) ? 200 : Math.min(1_000, Math.max(1, Math.trunc(limit)));

export class EventLog {
  #events: RecordedEvent[] = [];
  #listeners = new Set<() => void>();
  #limit: number;
  #next = 0;
  #scheduled = false;

  constructor(limit: number) {
    this.#limit = clampLimit(limit);
  }

  get = () => this.#events;

  setLimit = (limit: number) => {
    this.#limit = clampLimit(limit);

    if (this.#events.length <= this.#limit) {
      return;
    }

    this.#events = this.#events.slice(0, this.#limit);
    this.#notify();
  };

  subscribe = (listener: () => void) => {
    const notify = () => listener();
    this.#listeners.add(notify);
    return () => {
      this.#listeners.delete(notify);
    };
  };

  add = (event: RealtimeDiagnosticEvent, capturePayloads: boolean) => {
    this.#next += 1;
    this.#events = [
      {
        ...event,
        id: this.#next,
        ...describeContext(event, capturePayloads),
      },
      ...this.#events,
    ].slice(0, this.#limit);
    this.#notify();
  };

  clear = () => {
    this.#events = [];
    this.#notify();
  };

  #notify = () => {
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

        listener();
      }
    });
  };
}
