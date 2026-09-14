import type { ConnectionState } from "src/types/ConnectionState";
import type { ChannelStatus } from "src/types/ChannelStatus";

export type RealtimeSnapshot = {
  session: { id: string } | null;
  connection: ConnectionState;
  channels: Array<{
    name: string;
    state: ChannelStatus["state"];
    error: { code: number; message: string } | null;
    consumers: { events: number; status: number };
  }>;
};

export type RealtimeDiagnosticEvent = {
  /** `client` and `channel` come from the SDK. `runtime` is react-centrifugo's own session and channel lifecycle. */
  source: "client" | "channel" | "runtime";
  channel: string | null;
  type: string;
  timestamp: number;
  context: unknown;
};

/** Read-only view of the store. Observers never create or keep subscriptions. */
export type RealtimeDiagnostics = {
  get: () => RealtimeSnapshot;
  subscribe: (listener: () => void) => () => void;
  events: {
    subscribe: (
      listener: (event: RealtimeDiagnosticEvent) => void,
    ) => () => void;
  };
};
