import type { SubscriptionEvents } from "centrifuge";
import type { EventListenerView } from "src/types/internal/EventListenerView";
import type { ObservableValue } from "src/types/internal/ObservableValue";
import type { ChannelStatus } from "src/types/ChannelStatus";

export type RealtimeChannelView = {
  events: EventListenerView<SubscriptionEvents>;
  status: ObservableValue<ChannelStatus>;
};
