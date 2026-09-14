# Changelog

## react-centrifugo 0.2.0 — Unreleased

- Add a passive diagnostics bridge through `react-centrifugo/devtools` for connection, channel, and event inspection.
- Mark react-centrifugo's own session and channel lifecycle events with `source: "runtime"`.

## react-centrifugo-devtools 0.1.0 — Unreleased

- Inspect sessions, channel status, errors, and listener counts in a floating panel.
- Record a bounded event timeline with filtering, pause, clear, and optional payload capture.
- Observe existing subscriptions without creating or retaining them.
- Summarize each row inline and colour rows by kind: errors, publications, SDK lifecycle, and runtime events.
- Highlight unexpected disconnects and errors, and turn the collapsed launcher red when one arrives.
- Copy expanded contexts, search payload text, and keep connection events visible while a channel is selected.
- Show local time in rows with the UTC value on hover; clamp `maxEvents` instead of throwing.

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
