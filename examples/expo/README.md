# Expo Mission Control

The same dashboard as the web example, running on React Native through
react-centrifugo. It uses Uniwind, typed CVA variants, Phosphor icons, Zod
payload parsing, and the shared ts-pattern reducer from `examples/shared`.

```sh
pnpm --filter example-expo dev
```

Open it in Expo Go for SDK 57, or use `ios`, `android`, or `web` in place of
`dev`. A simulator or emulator must already be available for the native
shortcuts.

This package only ever builds a Centrifugo client, so the dashboard stays empty
until a server publishes. The [web example's README](../react/README.md) has a
working Centrifugo configuration and a publish command; point the endpoint field
at that server and publish the envelopes the app lists at the bottom of the
screen.

- On a physical phone, use your computer's reachable LAN address rather than
  `localhost`. Android emulators usually reach the host at `10.0.2.2`. Remote
  deployments should use `wss://`.
- Change the room to replace its subscriptions and reset the dashboard.
- Disconnect and reconnect to exercise session ownership. Backgrounding the app
  releases its session; returning restores your choice.

The startup initializer loads English Intl plural and relative-time polyfills
before the shared formatters run on Hermes. React and native dependencies are
pinned to Expo SDK 57's compatible versions.

```sh
pnpm --filter example-expo check:dependencies
pnpm --filter example-expo build         # Web export
pnpm --filter example-expo build:native  # iOS + Android Hermes bundles
```
