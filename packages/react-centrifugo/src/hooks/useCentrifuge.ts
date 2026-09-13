import { useObservableValue } from "src/hooks/internal/useObservableValue";
import { useRealtimeStore } from "src/hooks/internal/useRealtimeStore";

const getServerClient = () => null;

/**
 * Returns the current native client and rerenders when the session replaces or releases it.
 * Returns `null` before setup, during server rendering, or while the session is inactive.
 * Use `useConnectionState` to observe connection state changes on the same client.
 *
 * @example
 * ```ts
 * const client = useCentrifuge();
 * const sendMessage = async (text: string) => {
 *   if (client === null) {
 *     return;
 *   }
 *
 *   await client.publish("rooms:general", { text });
 * };
 * ```
 */
export const useCentrifuge = () => {
  const store = useRealtimeStore();

  return useObservableValue(store.client, getServerClient);
};
