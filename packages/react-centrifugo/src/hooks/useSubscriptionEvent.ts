import type { SubscriptionEvents } from "centrifuge";
import { useEffect, useEffectEvent } from "react";
import { useRealtimeStore } from "src/hooks/internal/useRealtimeStore";

import type { RealtimeEventHandler } from "src/types/internal/RealtimeEventHandler";

export type UseSubscriptionEventOptions = {
  /** Whether this listener is active. Defaults to true. */
  enabled?: boolean;
};

/**
 * Handles a native event on a shared channel subscription with the original SDK context.
 * Follows session changes and releases this listener when disabled or unmounted.
 *
 * @example
 * ```ts
 * useSubscriptionEvent("rooms:general", "error", ({ error }) => {
 *   console.error(error.message);
 * });
 * ```
 */
export const useSubscriptionEvent = <TEvent extends keyof SubscriptionEvents>(
  channel: string,
  event: TEvent,
  onEvent: RealtimeEventHandler<Parameters<SubscriptionEvents[TEvent]>[0]>,
  options: UseSubscriptionEventOptions = {},
) => {
  const store = useRealtimeStore();

  const enabled = options.enabled ?? true;

  const handleEvent = useEffectEvent(onEvent);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return store.channels
      .get(channel)
      .events.subscribe(event, (context) => handleEvent(context));
  }, [store, channel, event, enabled]);
};
