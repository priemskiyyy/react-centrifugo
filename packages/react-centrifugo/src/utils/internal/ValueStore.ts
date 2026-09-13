import type { ObservableValue } from "src/types/internal/ObservableValue";
import { invokeIsolated } from "src/utils/internal/invokeIsolated";

export class ValueStore<TValue> implements ObservableValue<TValue> {
  #snapshot: { value: TValue };
  #listeners = new Set<{ notify: () => void }>();

  constructor(initialValue: TValue) {
    this.#snapshot = { value: initialValue };
  }

  get = () => this.#snapshot.value;

  set = (nextValue: TValue) => {
    if (Object.is(nextValue, this.#snapshot.value)) {
      return;
    }

    const snapshot = { value: nextValue };
    this.#snapshot = snapshot;

    for (const listener of [...this.#listeners]) {
      // A nested update has already notified listeners of the latest snapshot.
      if (snapshot !== this.#snapshot) {
        return;
      }

      if (!this.#listeners.has(listener)) {
        continue;
      }

      invokeIsolated(listener.notify);
    }
  };

  subscribe = (notify: () => void) => {
    const listener = { notify };
    this.#listeners.add(listener);

    return () => {
      this.#listeners.delete(listener);
    };
  };
}
