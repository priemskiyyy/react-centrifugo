import type { RealtimeEventHandler } from "src/types/internal/RealtimeEventHandler";
import type { ConnectionState } from "src/types/ConnectionState";
import { useObservableValue } from "src/hooks/internal/useObservableValue";
import { useRealtimeStore } from "src/hooks/internal/useRealtimeStore";

const getServerConnectionState = (): ConnectionState => "disconnected";

/**
 * Reads connection state and rerenders on changes; `onChange` runs on subsequent updates.
 * Returns `disconnected` during server rendering or while the session is inactive.
 *
 * @example
 * ```ts
 * const state = useConnectionState((nextState) => {
 *   console.log("Connection:", nextState);
 * });
 * ```
 */
export const useConnectionState = (
  onChange?: RealtimeEventHandler<ConnectionState>,
) => {
  const store = useRealtimeStore();

  return useObservableValue(
    store.connection,
    getServerConnectionState,
    onChange,
  );
};
