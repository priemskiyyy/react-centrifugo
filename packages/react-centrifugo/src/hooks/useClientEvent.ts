import type { ClientEvents } from "centrifuge";
import { useEffect, useEffectEvent } from "react";
import { useCentrifuge } from "src/hooks/useCentrifuge";
import type { NativeEmitter } from "src/types/internal/NativeEmitter";
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
  const client = useCentrifuge();

  const handleEvent = useEffectEvent(onEvent);

  useEffect(() => {
    if (client === null) {
      return;
    }

    const emitter: NativeEmitter<ClientEvents> = client;
    const listener = (context: Parameters<ClientEvents[TEvent]>[0]) => {
      handleEvent(context);
    };
    emitter.on(event, listener);

    return () => {
      emitter.off(event, listener);
    };
  }, [client, event]);
};
