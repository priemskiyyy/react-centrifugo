import type { Centrifuge, ClientEvents } from "centrifuge";
import type { EventListenerView } from "src/types/internal/EventListenerView";
import type { ObservableValue } from "src/types/internal/ObservableValue";
import type { RealtimeChannelView } from "src/types/internal/RealtimeChannelView";
import type { ConnectionState } from "src/types/ConnectionState";

export type RealtimeStoreApi = {
  client: ObservableValue<Centrifuge | null> & {
    events: EventListenerView<ClientEvents>;
  };
  connection: ObservableValue<ConnectionState>;
  channels: { get: (channel: string) => RealtimeChannelView };
};
