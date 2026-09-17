import type { EventMap } from "centrifuge";

/**
 * The narrow view this package needs of an SDK emitter. Centrifuge's own `on`
 * accepts internal events too, so a structural type keeps the generic handler
 * assignable without widening this package's public event maps.
 */
export type NativeEmitter<TEvents extends EventMap> = {
  on: <TEvent extends keyof TEvents>(
    event: TEvent,
    listener: (context: Parameters<TEvents[TEvent]>[0]) => void,
  ) => unknown;
  off: NativeEmitter<TEvents>["on"];
};
