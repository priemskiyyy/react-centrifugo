# Devtools

The `@priemskiyyy/simulcast-devtools` package shows connection state, channel registrations, and an event timeline. It reads the runtime this package is built on, so it works here without a Centrifugo-specific panel. Install it as a development dependency.

```sh
pnpm add -D @priemskiyyy/simulcast-devtools
```

```tsx
import { CentrifugeProvider } from "react-centrifugo";
import { SimulcastDevtools } from "@priemskiyyy/simulcast-devtools/react";

<CentrifugeProvider configuration={configuration}>
  <App />
  {import.meta.env.DEV ? (
    <SimulcastDevtools initialIsOpen maxEvents={200} />
  ) : null}
</CentrifugeProvider>;
```

Use your bundler's development flag; the example above uses Vite. The panel renders inside a shadow root, so host styles do not reach it. The runtime has no dependency on the devtools UI.

## Inspect channels

The header shows the adapter, the session, and the connection state. The sidebar lists channels with registered listeners, their state, listener counts, and the last error. Publication listeners create subscription demand; status observers watch it. Counts represent listener registrations, so a component using several hooks may appear as several listeners.

Selecting a channel filters the timeline to that channel plus connection events, since a disconnect usually explains a stuck subscription.

Opening devtools never subscribes to a channel or keeps one alive. Removing the last publication listener still releases the native subscription.

## Read the timeline

Rows show the local time, event type, channel, and a summary drawn from the context. Rows are coloured by kind. Chips filter one kind at a time, and the search box matches the rest. Expanding a row shows the full context with a copy button.

The panel docks to the bottom or the right edge and resizes by drag or arrow keys.

## Record events

Recording starts when the panel mounts and continues while collapsed. Pause and Clear affect only the inspector. Connection and channel snapshots keep updating while recording is paused. Events from before mounting cannot be reconstructed.

Payload capture is off initially. Enabling it records payloads for subsequent events and redacts property names such as `token`, `authorization`, and `password`. Arbitrary strings may still contain sensitive information. Contexts are copied into bounded text when captured, so history retains no SDK objects.

`maxEvents` defaults to 200 and is clamped to 1–1000. The open state, dock position, and size persist in `localStorage`.

Under `StrictMode`, React mounts the provider twice in development, so the first milliseconds show a session start, end, and start again. That is React's double-invocation, not a reconnect.

## Scope

Each panel observes its nearest `CentrifugeProvider`. Server rendering produces an empty host element and opens no connection. Opening with `initialIsOpen` never moves focus away from the application. The panel targets browsers and does not include a native mobile panel, message replay, component names, or runtime TypeScript schemas.

## Custom integrations

The panel reads the runtime's own diagnostics. Applications that want the same
passive view without the UI read it from the client, which
[simulcast's client reference](https://priemskiyyy.github.io/simulcast/client)
documents. This package exposes no diagnostics entry of its own.
