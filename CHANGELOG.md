# Changelog

## react-centrifugo 0.3.0 — 2026-09-17

The hooks now run on [simulcast](https://priemskiyyy.github.io/simulcast/) and its Centrifugo adapter, which own subscription sharing and cleanup. `useChannel`, `useChannelDemand`, `useChannelStatus`, `useConnectionState`, and `createChannelEventHooks` are re-exported from `@priemskiyyy/simulcast-react` unchanged. This package keeps the three hooks that reach Centrifugo's native SDK surface.

- **Breaking.** A publication handler's second argument is the runtime publication, `{ data, event?, native }`. Centrifugo's own context, with its offset and tags, moved to `native`.
- **Breaking.** `createChannelEventHooks` decodes the whole publication rather than its data. Destructure `data` to keep the previous behaviour.
- **Breaking.** `ChannelStatus.error` carries the adapter error untyped, as `{ error: unknown }`, instead of Centrifugo's `SubscriptionErrorContext`.
- **Breaking.** The `react-centrifugo/devtools` entry is gone. Install `@priemskiyyy/simulcast-devtools` and mount its panel.
- **Breaking.** `react-centrifugo-codegen` and `react-centrifugo-devtools` are no longer published from this repository. `@priemskiyyy/simulcast-codegen` and `@priemskiyyy/simulcast-devtools` replace them; set the codegen `runtime` to `react-centrifugo`.
- **Breaking.** A session reads the configuration of the render that starts it. Credential callbacks handed to a running session no longer reach it; change `session.id` to apply them.
- Add `useChannelDemand`, which holds a channel's subscription open without consuming publications.
- Export `CentrifugeRealtimeClient`. Registering it with `@priemskiyyy/simulcast-react` types every re-exported hook with Centrifugo's native types.
- Report recovery on channel status: `recovered` says whether Centrifugo replayed the publications missed since the last subscription.
- Add an Expo example that runs the web example's dashboard on React Native.

## react-centrifugo 0.2.0 — 2026-09-14

- Add a passive diagnostics bridge through `react-centrifugo/devtools` for connection, channel, and event inspection.
- Mark react-centrifugo's own session and channel lifecycle events with `source: "runtime"`.

## react-centrifugo-devtools 0.2.0 — 2026-09-14

- Inspect sessions, channel status, errors, and listener counts in a floating panel.
- Record a bounded event timeline with filtering, pause, clear, and optional payload capture.
- Observe existing subscriptions without creating or retaining them.
- Summarize each row inline and colour rows by kind: errors, publications, SDK lifecycle, and runtime events.
- Highlight unexpected disconnects and errors, and turn the collapsed launcher red when one arrives.
- Copy expanded contexts, search payload text, and keep connection events visible while a channel is selected.
- Show local time in rows with the UTC value on hover; clamp `maxEvents` instead of throwing.

## react-centrifugo-codegen 0.2.0 — 2026-09-14

- Match the runtime and devtools version. No functional changes.

## react-centrifugo-codegen 0.1.1 — 2026-09-13

- Fix the documentation link in the npm README.

## react-centrifugo 0.1.0 — 2026-09-13

- Provider-managed sessions with shared channel subscriptions and cleanup.
- Publication hooks with optional parsing and explicit payload types.
- Typed event hooks created from application-defined maps and decoders.
- Connection state, channel status, native event hooks, and nullable native client access.
- SSR and hydration support, with StrictMode lifecycle coverage.
- Browser integration tests against Centrifugo, including authentication, refresh, recovery, and repeated cleanup.

## react-centrifugo-codegen 0.1.0 — 2026-09-13

- Generate named React hooks from TypeScript event maps without copying payload definitions.
- Validate configuration with a published JSON schema.
- Check generated files for drift and watch source changes through the Effect CLI.
- Preserve handwritten files and remove only owned generated output.
- Provide a synchronous generation API for custom tooling.
