export { CentrifugeProvider } from "src/context/CentrifugeProvider";
export type { CentrifugeProviderProps } from "src/context/CentrifugeProvider";
export type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";

export { useCentrifuge } from "src/hooks/useCentrifuge";
export { useClientEvent } from "src/hooks/useClientEvent";
export { useSubscriptionEvent } from "src/hooks/useSubscriptionEvent";
export type { UseSubscriptionEventOptions } from "src/hooks/useSubscriptionEvent";

// Channel consumption is the runtime's, not this package's. These come from the
// React binding unchanged, so an application can mix both imports freely.
export {
  createChannelEventHooks,
  useChannel,
  useChannelDemand,
  useChannelStatus,
  useConnectionState,
} from "@priemskiyyy/simulcast-react";
export type {
  ChannelEventConfiguration,
  ChannelInput,
  DecodedEvent,
  EventDefinition,
  PublicationHandler,
  UseChannelOptions,
} from "@priemskiyyy/simulcast-react";
export type {
  ChannelStatus,
  ConnectionState,
  RealtimePublication as Publication,
} from "@priemskiyyy/simulcast";
