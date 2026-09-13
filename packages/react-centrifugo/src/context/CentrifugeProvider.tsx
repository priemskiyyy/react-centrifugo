import { useEffect, useEffectEvent, useState } from "react";
import type { PropsWithChildren } from "react";
import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";
import { RealtimeClientStore } from "src/utils/RealtimeClientStore";
import { RealtimeStoreContext } from "src/context/RealtimeStoreContext";

export type CentrifugeProviderProps = PropsWithChildren<{
  configuration: CentrifugeConfiguration;
}>;

/**
 * Owns the realtime session; changing its ID or disabling it releases the previous client.
 *
 * @example
 * ```tsx
 * <CentrifugeProvider
 *   configuration={{
 *     session: { id: "user:42" },
 *     transport: "wss://example.com/connection/websocket",
 *   }}
 * >
 *   <div>Connected components go here.</div>
 * </CentrifugeProvider>
 * ```
 */
export const CentrifugeProvider = ({
  configuration,
  children,
}: CentrifugeProviderProps) => {
  const [store] = useState(() => new RealtimeClientStore());

  const getConfiguration = useEffectEvent(() => configuration);

  const enabled = configuration.session.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return store.session.set({ get: getConfiguration });
  }, [store, configuration.session.id, enabled]);

  return (
    <RealtimeStoreContext.Provider value={store.api}>
      {children}
    </RealtimeStoreContext.Provider>
  );
};
