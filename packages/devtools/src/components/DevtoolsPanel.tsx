import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { RealtimeSnapshot } from "react-centrifugo/devtools";
import { ChannelList } from "src/components/ChannelList";
import { EventTimeline } from "src/components/EventTimeline";
import { OrbitIcon } from "src/components/OrbitIcon";
import { assertUnreachable } from "src/utils/assertUnreachable";
import type { DevtoolsState } from "src/utils/devtoolsState";
import type { RecordedEvent } from "src/utils/EventLog";

type DevtoolsPanelProps = {
  snapshot: RealtimeSnapshot;
  events: RecordedEvent[];
  recording: DevtoolsState["recording"];
  /** False when `initialIsOpen` opened the panel, so mounting never steals focus. */
  autoFocus: boolean;
  onTogglePause: () => void;
  onCapturePayloadsChange: (enabled: boolean) => void;
  onClear: () => void;
  onClose: () => void;
};

export const DevtoolsPanel = ({
  snapshot,
  events,
  recording,
  autoFocus,
  onTogglePause,
  onCapturePayloadsChange,
  onClear,
  onClose,
}: DevtoolsPanelProps) => {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (autoFocus) {
      panel.current?.focus();
    }
  }, [autoFocus]);

  const filter = query.trim().toLowerCase();
  const isFiltered = selectedChannel !== null || filter !== "";
  const visibleEvents = events.filter((event) => {
    // Keep connection events when a channel is selected. A disconnect is usually why a subscription is stuck.
    const isOtherChannel =
      selectedChannel !== null &&
      event.channel !== null &&
      event.channel !== selectedChannel;

    if (isOtherChannel) {
      return false;
    }

    return `${event.type} ${event.channel ?? "connection"} ${event.summary} ${event.context}`
      .toLowerCase()
      .includes(filter);
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") {
      return;
    }

    event.stopPropagation();
    onClose();
  };
  const handleClearFilters = () => {
    setSelectedChannel(null);
    setQuery("");
  };

  return (
    <aside
      ref={panel}
      tabIndex={-1}
      className="rc-panel"
      aria-label="React Centrifugo devtools"
      onKeyDown={handleKeyDown}
    >
      <PanelHeader snapshot={snapshot} onClose={onClose} />
      <div className="rc-body">
        <ChannelList
          channels={snapshot.channels}
          selectedChannel={selectedChannel}
          onSelect={setSelectedChannel}
        />
        <div className="rc-main">
          <div className="rc-toolbar">
            <input
              aria-label="Filter events"
              type="search"
              placeholder="Filter by type, channel, or payload…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="button"
              aria-pressed={recording.isPaused}
              onClick={onTogglePause}
            >
              {recording.isPaused ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={onClear}>
              Clear
            </button>
            <label className="rc-capture">
              <input
                type="checkbox"
                checked={recording.capturePayloads}
                onChange={(event) =>
                  onCapturePayloadsChange(event.target.checked)
                }
              />
              Capture payloads
            </label>
            <span className="rc-total">
              {visibleEvents.length} / {events.length}
            </span>
          </div>
          <EventTimeline
            events={visibleEvents}
            emptyState={
              <TimelineEmptyState
                variant={getEmptyStateVariant(isFiltered, recording.isPaused)}
                onClearFilters={handleClearFilters}
              />
            }
          />
        </div>
      </div>
    </aside>
  );
};

type PanelHeaderProps = {
  snapshot: RealtimeSnapshot;
  onClose: () => void;
};

const PanelHeader = ({ snapshot, onClose }: PanelHeaderProps) => (
  <header className="rc-header">
    <OrbitIcon />
    <strong>React Centrifugo</strong>
    <span className="rc-label">devtools</span>
    <code className="rc-session" title="Session">
      {snapshot.session === null ? "no session" : snapshot.session.id}
    </code>
    <span className="rc-connection">
      <span className="rc-dot" data-state={snapshot.connection} />
      {snapshot.connection}
    </span>
    <button
      type="button"
      className="rc-close"
      aria-label="Close devtools"
      onClick={onClose}
    >
      ×
    </button>
  </header>
);

type EmptyStateVariant = "NO_MATCHES" | "PAUSED" | "WAITING";

const getEmptyStateVariant = (
  isFiltered: boolean,
  isPaused: boolean,
): EmptyStateVariant => {
  if (isFiltered) {
    return "NO_MATCHES";
  }

  if (isPaused) {
    return "PAUSED";
  }

  return "WAITING";
};

type TimelineEmptyStateProps = {
  variant: EmptyStateVariant;
  onClearFilters: () => void;
};

const TimelineEmptyState = ({
  variant,
  onClearFilters,
}: TimelineEmptyStateProps) => {
  if (variant === "NO_MATCHES") {
    return (
      <>
        <strong>No matching events</strong>
        <p>Try another search or show all channels.</p>
        <button type="button" onClick={onClearFilters}>
          Clear filters
        </button>
      </>
    );
  }

  if (variant === "PAUSED") {
    return (
      <>
        <strong>Recording paused</strong>
        <p>Your application keeps running. Resume to capture new events.</p>
      </>
    );
  }

  if (variant === "WAITING") {
    return (
      <>
        <strong>Waiting for events</strong>
        <p>
          Connection changes and publications appear here as your application
          runs.
        </p>
      </>
    );
  }

  return assertUnreachable(variant);
};
