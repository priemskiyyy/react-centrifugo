import {
  useEffect,
  useEffectEvent,
  useReducer,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  RealtimeDiagnosticEvent,
  RealtimeSnapshot,
} from "react-centrifugo/devtools";
import { assertUnreachable } from "src/utils/assertUnreachable";
import { EventLog } from "src/utils/EventLog";
import type { RecordedEvent } from "src/utils/EventLog";
import { devtoolsReducer, initialDevtoolsState } from "src/utils/devtoolsState";
import { DevtoolsPanel } from "src/components/DevtoolsPanel";
import { useRealtimeDiagnostics } from "react-centrifugo/devtools";
import { OrbitIcon } from "src/components/OrbitIcon";
import { styles } from "src/styles";

const emptySnapshot = {
  session: null,
  connection: "disconnected",
  channels: [],
} satisfies RealtimeSnapshot;
const emptyEvents: RecordedEvent[] = [];
const getServerSnapshot = () => emptySnapshot;
const getServerEvents = () => emptyEvents;

export type ReactCentrifugoDevtoolsProps = {
  initialIsOpen?: boolean;
  /** Events kept in memory. Defaults to 200, clamped to 1–1000. */
  maxEvents?: number;
};

/**
 * Floating inspector for the nearest `CentrifugeProvider`. Observes without
 * creating subscriptions. Records while mounted, also when collapsed. Payload
 * capture starts off.
 *
 * @example
 * ```tsx
 * <CentrifugeProvider configuration={configuration}>
 *   <App />
 *   {import.meta.env.DEV ? <ReactCentrifugoDevtools /> : null}
 * </CentrifugeProvider>
 * ```
 */
export const ReactCentrifugoDevtools = ({
  initialIsOpen = false,
  maxEvents = 200,
}: ReactCentrifugoDevtoolsProps) => {
  const diagnostics = useRealtimeDiagnostics();
  const snapshot = useSyncExternalStore(
    diagnostics.subscribe,
    diagnostics.get,
    getServerSnapshot,
  );
  const [log] = useState(() => new EventLog(maxEvents));
  const events = useSyncExternalStore(log.subscribe, log.get, getServerEvents);
  const [{ panel, recording }, dispatch] = useReducer(
    devtoolsReducer,
    initialIsOpen,
    initialDevtoolsState,
  );
  const capture = useEffectEvent((event: RealtimeDiagnosticEvent) =>
    log.add(event, recording.capturePayloads),
  );

  useEffect(() => {
    log.setLimit(maxEvents);
  }, [log, maxEvents]);

  useEffect(() => {
    if (recording.isPaused) {
      return;
    }
    return diagnostics.events.subscribe((event) => capture(event));
  }, [diagnostics, recording.isPaused]);

  return (
    <div className="rc-devtools">
      <style href="react-centrifugo-devtools" precedence="default">
        {styles}
      </style>
      {(() => {
        if (panel.status === "OPEN") {
          return (
            <DevtoolsPanel
              snapshot={snapshot}
              events={events}
              recording={recording}
              autoFocus={panel.focusPanel}
              onTogglePause={() => dispatch({ type: "TOGGLE_PAUSE" })}
              onCapturePayloadsChange={(enabled) =>
                dispatch({ type: "SET_CAPTURE_PAYLOADS", enabled })
              }
              onClear={log.clear}
              onClose={() => dispatch({ type: "CLOSE", at: Date.now() })}
            />
          );
        }

        if (panel.status === "CLOSED") {
          return (
            <Launcher
              connection={snapshot.connection}
              hasUnseenError={events.some(
                (event) =>
                  event.kind === "ERROR" && event.timestamp > panel.closedAt,
              )}
              autoFocus={panel.focusLauncher}
              onOpen={() => dispatch({ type: "OPEN" })}
            />
          );
        }

        return assertUnreachable(panel);
      })()}
    </div>
  );
};

type LauncherProps = {
  connection: RealtimeSnapshot["connection"];
  hasUnseenError: boolean;
  autoFocus: boolean;
  onOpen: () => void;
};

const Launcher = ({
  connection,
  hasUnseenError,
  autoFocus,
  onOpen,
}: LauncherProps) => (
  <button
    type="button"
    className="rc-launcher"
    autoFocus={autoFocus}
    aria-label="Open React Centrifugo devtools"
    onClick={onOpen}
  >
    <OrbitIcon />
    <span>Realtime</span>
    <span
      className="rc-dot"
      data-state={hasUnseenError ? "error" : connection}
    />
  </button>
);
