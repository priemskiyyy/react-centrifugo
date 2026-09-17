import type { Centrifuge } from "centrifuge";
import { useSyncExternalStore } from "react";
import { useRealtimeClient } from "src/hooks/internal/useRealtimeClient";

const getServerClient = (): Centrifuge | null => null;

/**
 * The current native client, or `null` while no session is active.
 *
 * @example
 * ```ts
 * const client = useCentrifuge();
 * await client?.publish("rooms:general", { text: "hello" });
 * ```
 */
export const useCentrifuge = () => {
  const { native } = useRealtimeClient();

  return useSyncExternalStore(native.subscribe, native.get, getServerClient);
};
