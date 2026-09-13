import type { RealtimeEventHandler } from "src/types/internal/RealtimeEventHandler";
import { useMemo } from "react";
import type { ChannelStatus } from "src/types/ChannelStatus";
import { DETACHED_CHANNEL_STATUS } from "src/utils/constants/realtimeChannel";
import { useObservableValue } from "src/hooks/internal/useObservableValue";
import { useRealtimeStore } from "src/hooks/internal/useRealtimeStore";

const getServerChannelStatus = () => DETACHED_CHANNEL_STATUS;

/**
 * Observes channel status without opening a native subscription.
 * Returns `detached` until an event listener opens one; `onChange` runs on subsequent updates.
 *
 * @example
 * ```ts
 * const { state, error } = useChannelStatus("rooms:general", (status) => {
 *   console.log("Channel:", status.state);
 * });
 * ```
 */
export const useChannelStatus = (
  channel: string,
  onChange?: RealtimeEventHandler<ChannelStatus>,
) => {
  const store = useRealtimeStore();

  // Channel views are created on demand; keep the subscription stable across renders.
  const status = useMemo(
    () => store.channels.get(channel).status,
    [store, channel],
  );

  return useObservableValue(status, getServerChannelStatus, onChange);
};
