import type { SubscriptionErrorContext, SubscriptionState } from "centrifuge";

/**
 * `detached` means no consumer has opened a subscription for this channel, so
 * the SDK reports no state of its own. Every other state comes from the SDK.
 */
export type ChannelStatus = {
  state: `${SubscriptionState}` | "detached";
  error: SubscriptionErrorContext | null;
};
