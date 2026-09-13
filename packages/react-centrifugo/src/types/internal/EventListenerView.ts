import type { EventMap } from "centrifuge";
import type { RealtimeEventHandler } from "src/types/internal/RealtimeEventHandler";

export type EventListenerView<TEvents extends EventMap> = {
  subscribe: <TEvent extends keyof TEvents>(
    event: TEvent,
    onEvent: RealtimeEventHandler<Parameters<TEvents[TEvent]>[0]>,
  ) => () => void;
};
