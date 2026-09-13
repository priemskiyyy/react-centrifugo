import type { PublicationHandler } from "src/types/Publication";
import { useChannel } from "src/hooks/useChannel";
import type { UseChannelOptions } from "src/hooks/useChannel";

export type EventDefinition = { channel: string; payload: unknown };
export type DecodedEvent = { eventType: string; payload: unknown };
export type ChannelEventConfiguration = {
  /** Extracts the event name and payload, or returns null to ignore a publication. */
  decode: (data: unknown) => DecodedEvent | null;
};

/**
 * Creates a `useChannelEvent` hook typed by your event map and publication decoder.
 * Create it once outside your components.
 *
 * @example
 * ```ts
 * type Events = {
 *   "count.updated": { channel: "visitors"; payload: number };
 * };
 * const { useChannelEvent } = createChannelEventHooks<Events>({
 *   decode: (data) => ({ eventType: "count.updated", payload: Number(data) }),
 * });
 * ```
 */
export const createChannelEventHooks = <
  TEvents extends { [TKey in keyof TEvents]: EventDefinition },
>(
  configuration: ChannelEventConfiguration,
) => {
  const useChannelEvent = <TEvent extends Extract<keyof TEvents, string>>(
    channel: TEvents[NoInfer<TEvent>]["channel"],
    eventType: TEvent,
    onEvent: PublicationHandler<TEvents[NoInfer<TEvent>]["payload"]>,
    options: UseChannelOptions<TEvents[NoInfer<TEvent>]["payload"]> = {},
  ) => {
    useChannel(
      channel,
      (data, publication) => {
        const event = configuration.decode(data);

        if (event === null) {
          return;
        }

        if (event.eventType !== eventType) {
          return;
        }

        if (typeof options.parse !== "function") {
          return onEvent(event.payload, publication);
        }

        return onEvent(options.parse(event.payload), publication);
      },
      { enabled: options.enabled ?? true },
    );
  };

  return {
    /**
     * Handles matching decoded events; other publications are ignored.
     * Channel and payload types follow `eventType`; use `parse` for runtime validation.
     *
     * @example
     * ```ts
     * useChannelEvent("visitors", "count.updated", (count) => {
     *   console.log(count.toFixed());
     * });
     * ```
     */
    useChannelEvent,
  };
};
