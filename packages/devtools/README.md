# react-centrifugo-devtools

Inspect React Centrifugo connections, channels, and publications in your browser.

This package is being developed alongside `react-centrifugo@0.2.0`. It is available in this repository's workspace and has not been published to npm yet.

## Usage

Mount the panel inside the provider you want to inspect:

```tsx
import { CentrifugeProvider } from "react-centrifugo";
import { ReactCentrifugoDevtools } from "react-centrifugo-devtools";

<CentrifugeProvider configuration={configuration}>
  <App />
  {import.meta.env.DEV ? <ReactCentrifugoDevtools /> : null}
</CentrifugeProvider>;
```

This example uses Vite's development flag. With another bundler, use its equivalent build-time flag. Importing the runtime alone does not include the devtools panel or styles.

Requires React 19.2+ and React Centrifugo 0.2.x. The panel targets browsers; it is safe to render on the server with an empty initial snapshot. It does not provide a React Native UI.

```tsx
<ReactCentrifugoDevtools initialIsOpen maxEvents={200} />
```

`initialIsOpen` defaults to `false`. `maxEvents` defaults to 200; values outside 1 to 1000 are clamped rather than thrown, and lowering the limit discards older entries. Escape closes the panel when focus is inside it. Opening with `initialIsOpen` never moves focus away from your application.

## What you see

**Header.** The session id and the current connection state.

**Channel sidebar.** Every channel with registered listeners, including detached channels that only have status observers. Each entry shows the subscription state, the listener and observer counts, and the subscription error if there is one. Selecting a channel filters the timeline to that channel plus connection events, because a disconnect usually explains a stuck subscription.

**Timeline.** Newest first. Each row shows the local time, the event type, the channel, and a one-line summary drawn from the context: the disconnect reason and code, the transport, the recovery outcome, or a payload preview once capture is on. Rows are coloured by kind:

| Kind        | Colour | Examples                                                                |
| ----------- | ------ | ----------------------------------------------------------------------- |
| Error       | red    | `error`, and any disconnect or unsubscribe your app did not ask for     |
| Publication | bright | `publication`                                                           |
| Lifecycle   | cyan   | `connecting`, `connected`, `subscribing`, `subscribed`, `join`, `leave` |
| Runtime     | muted  | `session.started`, `channel.added`, `subscription.detached`             |

Expanding a row shows the full context as JSON with a **Copy** button. Hovering a timestamp shows the UTC ISO value for matching against server logs.

**Toolbar.** The filter matches type, channel, summary, and captured payload text. **Pause** stops recording without affecting your application. **Clear** empties the history. **Capture payloads** opts into recording `data` and `info`. The counter shows visible and total events.

**Launcher.** When collapsed, a small button shows the connection state. It turns red when an error arrives while the panel is closed.

Listener counts describe registrations, not React components. Multiple hooks in one component register multiple listeners. Status observers do not request native subscriptions. Devtools itself is excluded from these counts.

## Recording

Recording starts when devtools mounts and continues while the panel is collapsed. Events from before mounting are not available, but the channel list immediately shows existing registrations. Unmounting releases the observer and history.

Payload capture starts off. Enable **Capture payloads** to inspect `data` and `info` in subsequent events. Turning it off does not erase previously captured payloads; use Clear to remove them. Sensitive property names such as `token`, `authorization`, and `password` are redacted. This does not detect secrets embedded in arbitrary strings.

History stays in memory; nothing is persisted or sent anywhere. Contexts are copied into bounded text at capture time, so history does not retain SDK objects or entire payload graphs. Long strings, wide objects, and deep structures are truncated. Getters and `toJSON` methods are not executed.

Each instance observes its nearest provider. The inspector does not create subscriptions, keep channels alive, or offer actions that change connection behaviour.

Under `StrictMode`, React mounts the provider twice in development, so the first milliseconds show a session start, end, and start again. That is React's double-invocation, not a reconnect.

## Custom integrations

`useRealtimeDiagnostics` from `react-centrifugo/devtools` exposes the passive bridge the panel is built on: a cached `get()` snapshot, `subscribe()` for snapshot changes, and `events.subscribe()` for SDK contexts. Event `source` is `client` or `channel` for SDK events and `runtime` for react-centrifugo's own session and channel lifecycle. Event contexts are live SDK values, so copy what you need before keeping it.

## Try it

The workspace example opens devtools automatically in development. Configure a Centrifugo endpoint that allows the example's `rooms:<id>` channel.

```sh
pnpm install
pnpm build
pnpm --filter example-react dev
```

The browser-test playground runs against a local Centrifugo in Docker and offers scenario links for the happy path, token refresh, and an invalid token, plus a second channel and a publish form:

```sh
node tests/browser/server.mjs &
pnpm exec vite --config tests/browser/vite.config.ts
```

Then open `http://127.0.0.1:4173/?devtools`.
