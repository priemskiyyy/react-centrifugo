import type { ClientEvents } from "centrifuge";
import { useEffect, useEffectEvent } from "react";
import { useRealtimeStore } from "src/hooks/internal/useRealtimeStore";
import type { RealtimeEventHandler } from "src/types/internal/RealtimeEventHandler";

/**
 * Handles a native client event across session replacements, preserving the SDK context.
 * Events are not replayed; use `useConnectionState` to read the current state.
 *
 * @example
 * ```ts
 * useClientEvent("disconnected", ({ code, reason }) => {
 *   console.log("Disconnected:", code, reason);
 * });
 * ```
 */
export const useClientEvent = <TEvent extends keyof ClientEvents>(
  event: TEvent,
  onEvent: RealtimeEventHandler<Parameters<ClientEvents[TEvent]>[0]>,
) => {
  const store = useRealtimeStore();

  const handleEvent = useEffectEvent(onEvent);

  useEffect(() => {
    return store.client.events.subscribe(event, (context) =>
      handleEvent(context),
    );
  }, [store, event]);
};
