# Changelog

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
