import type { SubscriptionEvents } from "centrifuge";
import { useEffect, useEffectEvent } from "react";
import { useChannelDemand } from "@priemskiyyy/simulcast-react";
import { useNativeChannel } from "src/hooks/internal/useNativeChannel";
import type { NativeEmitter } from "src/types/internal/NativeEmitter";
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
  const subscription = useNativeChannel(channel);

  const enabled = options.enabled ?? true;

  const handleEvent = useEffectEvent(onEvent);

  // IMPORTANT
  // This listener needs a native subscription to exist, and observing one
  // never opens it.
  useChannelDemand(channel, { enabled });

  useEffect(() => {
    if (!enabled || subscription === null) {
      return;
    }

    const emitter: NativeEmitter<SubscriptionEvents> = subscription;
    const listener = (context: Parameters<SubscriptionEvents[TEvent]>[0]) => {
      handleEvent(context);
    };
    emitter.on(event, listener);

    return () => {
      emitter.off(event, listener);
    };
  }, [subscription, event, enabled]);
};
