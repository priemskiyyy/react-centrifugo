import { useState } from "react";
import type { ReactNode } from "react";
import { formatEventTime } from "src/formatting/formatEventTime";
import type { RecordedEvent } from "src/utils/EventLog";

type EventTimelineProps = {
  events: RecordedEvent[];
  emptyState: ReactNode;
};

export const EventTimeline = ({ events, emptyState }: EventTimelineProps) => {
  if (events.length === 0) {
    return <div className="rc-empty">{emptyState}</div>;
  }

  return (
    <div className="rc-events" aria-label="Event timeline">
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </div>
  );
};

type EventRowProps = {
  event: RecordedEvent;
};

const EventRow = ({ event }: EventRowProps) => {
  const isoTimestamp = new Date(event.timestamp).toISOString();

  return (
    <details className="rc-event" data-kind={event.kind}>
      <summary>
        <time dateTime={isoTimestamp} title={isoTimestamp}>
          {formatEventTime(event.timestamp)}
        </time>
        <span className="rc-event-type">{event.type}</span>
        <span className="rc-event-channel">
          {event.channel ?? "connection"}
        </span>
        <span className="rc-event-summary" title={event.summary}>
          {event.summary}
        </span>
        <svg
          className="rc-expand"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
        >
          <path
            d="M2 3.5 5 6.5 8 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </summary>
      <div className="rc-context">
        <pre>{event.context}</pre>
        <CopyButton text={event.context} />
      </div>
    </details>
  );
};

type CopyButtonProps = {
  text: string;
};

const CopyButton = ({ text }: CopyButtonProps) => {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopyClick = () => {
    // No clipboard on insecure origins such as LAN dev servers. The button does nothing there.
    navigator.clipboard?.writeText(text).then(
      () => {
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 1_200);
      },
      () => {},
    );
  };

  return (
    <button type="button" className="rc-copy" onClick={handleCopyClick}>
      {hasCopied ? "Copied" : "Copy"}
    </button>
  );
};
