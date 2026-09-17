import { useMemo } from "react";
import type { PropsWithChildren } from "react";
import { RealtimeClient } from "@priemskiyyy/simulcast";
import { RealtimeProvider } from "@priemskiyyy/simulcast-react";
import { RealtimeClientContext } from "src/context/RealtimeClientContext";
import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";
import { createCentrifugoAdapter } from "src/utils/createCentrifugoAdapter";

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
  const { id, enabled = true } = configuration.session;

  const client = useMemo(
    () =>
      new RealtimeClient({
        adapter: createCentrifugoAdapter(configuration),
      }),
    // A new session reads the configuration of the render that starts it, as
    // the previous runtime did when it began one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  // The binding owns the session, and its provider also lets the shared
  // devtools and any simulcast hook work inside this one.
  return (
    <RealtimeClientContext.Provider value={client}>
      <RealtimeProvider client={client} session={{ id, enabled }}>
        {children}
      </RealtimeProvider>
    </RealtimeClientContext.Provider>
  );
};
