import type { PublicationHandler } from "src/types/Publication";
import { useSubscriptionEvent } from "src/hooks/useSubscriptionEvent";

export type UseChannelOptions<TData = unknown> = {
  /** Whether this listener is active. Defaults to true. */
  enabled?: boolean;
  /** Validates or transforms publication data before the callback receives it. */
  parse?: (data: unknown) => TData;
};

/**
 * Handles publications on a shared channel subscription and cleans up on unmount.
 * Supply `parse` for runtime validation; an explicit `TData` only declares the wire type.
 *
 * @example
 * ```ts
 * useChannel<{ text: string }>("rooms:general", (message) => {
 *   console.log(message.text);
 * });
 * ```
 */
export const useChannel = <TData = unknown>(
  channel: string,
  onEvent: PublicationHandler<NoInfer<TData>>,
  options: UseChannelOptions<TData> = {},
) => {
  useSubscriptionEvent(
    channel,
    "publication",
    (publication) => {
      if (typeof options.parse !== "function") {
        return onEvent(publication.data, publication);
      }

      return onEvent(options.parse(publication.data), publication);
    },
    { enabled: options.enabled ?? true },
  );
};
