import type { RealtimeEventHandler } from "src/types/internal/RealtimeEventHandler";
import type { ObservableValue } from "src/types/internal/ObservableValue";
import { useEffect, useEffectEvent, useSyncExternalStore } from "react";

/**
 * Reads an external snapshot and optionally observes subsequent changes with the latest callback.
 *
 * @example
 * ```ts
 * const store = useRealtimeStore();
 * const state = useObservableValue(
 *   store.connection,
 *   (): ConnectionState => "disconnected",
 * );
 * ```
 */
export const useObservableValue = <TValue>(
  value: ObservableValue<TValue>,
  getServerSnapshot: () => TValue,
  onChange?: RealtimeEventHandler<TValue>,
) => {
  const handleChange = useEffectEvent(() => {
    if (typeof onChange !== "function") {
      return;
    }

    return onChange(value.get());
  });

  const hasOnChange = typeof onChange === "function";

  // A separate effect-owned listener isolates callback errors from React's snapshot updates.
  useEffect(() => {
    if (!hasOnChange) {
      return;
    }

    return value.subscribe(() => handleChange());
  }, [value, hasOnChange]);

  return useSyncExternalStore(value.subscribe, value.get, getServerSnapshot);
};
