import { useMemo, useSyncExternalStore } from "react";
import type { Subscription } from "centrifuge";
import { useRealtimeClient } from "src/hooks/internal/useRealtimeClient";

const getServerSubscription = (): Subscription | null => null;

/**
 * The native subscription for a channel, or `null` while none exists. This
 * package builds the client, so the runtime's observable is already typed.
 */
export const useNativeChannel = (channel: string) => {
  const client = useRealtimeClient();

  // Channel handles are created on demand; keep the subscription stable across renders.
  const handle = useMemo(() => client.channel(channel), [client, channel]);

  return useSyncExternalStore(
    handle.native.subscribe,
    handle.native.get,
    getServerSubscription,
  );
};
