# Devtools

The experimental `react-centrifugo-devtools` package shows connection state, channel registrations, and an event timeline. It is available in the repository workspace alongside the unreleased runtime 0.2.0.

```tsx
import { CentrifugeProvider } from "react-centrifugo";
import { ReactCentrifugoDevtools } from "react-centrifugo-devtools";

<CentrifugeProvider configuration={configuration}>
  <App />
  {import.meta.env.DEV ? (
    <ReactCentrifugoDevtools initialIsOpen maxEvents={200} />
  ) : null}
</CentrifugeProvider>;
```

Use your bundler's development flag; the example above uses Vite. The panel and its styles live in a separate package. The runtime has no dependency on the devtools UI.

## Inspect channels

The sidebar lists channels with registered listeners, including detached channels that only have status observers. Event listeners create subscription demand; status observers watch it. Counts represent listener registrations, so a component using several hooks may appear as several listeners. A subscription error shows under its channel.

Selecting a channel filters the timeline to that channel plus connection events, since a disconnect usually explains a stuck subscription. Recorded events remain available after a channel is released, until they leave the history limit or you clear them.

Opening devtools never subscribes to a channel or keeps one alive. Removing the last application event listener still releases the native subscription.

## Read the timeline

Rows are newest first and show the local time, event type, channel, and a one-line summary drawn from the context: disconnect reason and code, transport, recovery outcome, or a payload preview once capture is on. Hovering a timestamp shows the UTC ISO value.

Rows are coloured by kind. Errors are red: every `error` event, plus any disconnect or unsubscribe the application did not ask for. Publications are bright, SDK lifecycle events are cyan, and react-centrifugo's own session and channel events are muted. Expanding a row shows the full context with a copy button. The filter matches type, channel, summary, and captured payload text.

When the panel is collapsed, the launcher turns red if an error arrives.

## Record events

The timeline records while devtools is mounted, even when collapsed. Pausing or clearing it affects only the inspector. Connection and channel snapshots continue updating while recording is paused. Events from before mounting cannot be reconstructed.

Payload capture is off initially. Enabling it records `data` and `info` for subsequent events. Recognized sensitive property names are redacted, but arbitrary strings may still contain sensitive information. Disabling capture leaves existing entries intact; Clear removes them.

History stays in memory with a default limit of 200 events. `maxEvents` is clamped to 1–1000. Event contexts are copied into bounded text, and large or deep values are truncated. The panel sends no telemetry and uses no persistent storage.

Under `StrictMode`, React mounts the provider twice in development, so the first milliseconds show a session start, end, and start again. That is React's double-invocation, not a reconnect.

## Scope

Each panel observes its nearest `CentrifugeProvider`. Server rendering uses an empty snapshot and does not open connections. Opening with `initialIsOpen` never moves focus away from the application. This first version targets browsers and does not include a native mobile panel, message replay, component names, or runtime TypeScript schemas.

## Custom integrations

`useRealtimeDiagnostics` from `react-centrifugo/devtools` exposes the passive bridge used by the panel. It provides cached `get()` snapshots, `subscribe()` change notifications, and `events.subscribe()` for SDK contexts. Every subscription returns its cleanup function.

Each event carries a `source`: `client` or `channel` for SDK events, and `runtime` for react-centrifugo's own session and channel lifecycle such as `session.started` or `channel.added`.

Snapshot objects contain copied metadata. Treat them as snapshots; changing them does not change the runtime. Event contexts are live SDK values, so copy or serialize the parts you need before keeping them. No client or store classes are exposed by this entry point.
