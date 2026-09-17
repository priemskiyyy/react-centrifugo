# React Centrifugo

Centrifugo hooks for [React](https://react.dev/). The provider builds a client from one configuration object and hands Centrifugo's native SDK surface to React. Subscription ownership, sharing, and cleanup come from [simulcast](https://priemskiyyy.github.io/simulcast/) and its Centrifugo adapter, so the channel hooks are that runtime's own, re-exported here unchanged.

Requires React `>=19.2 <20` and Centrifuge JS `>=5.7.2 <6`. Two shared tools work here: `@priemskiyyy/simulcast-codegen` generates named hooks from your event map, and `@priemskiyyy/simulcast-devtools` adds a browser panel for connections, channels, and events.

## Usage

```sh
pnpm add react-centrifugo centrifuge react
```

```tsx
import { CentrifugeProvider, useChannel } from "react-centrifugo";

type Message = { id: string; text: string };

function Room() {
  useChannel<Message>("rooms:demo", (message) => {
    console.log(message.text);
  });

  return null;
}

export function Application() {
  return (
    <CentrifugeProvider
      configuration={{
        session: { id: "current-user" },
        transport: "ws://localhost:8000/connection/websocket",
      }}
    >
      <Room />
    </CentrifugeProvider>
  );
}
```

Configure authentication and channel permissions on your Centrifugo server. The example above expects a local server that allows this connection and subscription.

`useChannel<T>()` declares the expected payload type. For runtime validation, pass `parse` in the hook options; its return type is inferred. Changing `session.id` replaces the client and reattaches active subscriptions. Setting `session.enabled` to `false` releases the session.

## Hooks

This package's own hooks reach Centrifugo's native SDK surface:

| Hook                                                      | Purpose                                                                    |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| `useCentrifuge()`                                         | Access the current native client, or `null` while the session is inactive. |
| `useSubscriptionEvent(channel, event, handler, options?)` | Receive native subscription events such as `join`, `leave`, `subscribed`.  |
| `useClientEvent(event, handler)`                          | Receive native client events.                                              |

Channel consumption comes from the runtime and is re-exported unchanged:

| Hook                                     | Purpose                                                               |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `useChannel(channel, handler, options?)` | Receive publications; optionally parse their data.                    |
| `useChannelDemand(channel, options?)`    | Hold a channel's subscription open without consuming publications.    |
| `useChannelStatus(channel, onChange?)`   | Observe subscription state, the last error, and the recovery outcome. |
| `useConnectionState(onChange?)`          | Read `disconnected`, `connecting`, or `connected`.                    |

[Hook reference](docs/hooks.md) · [Authentication and sessions](docs/configuration.md) · [Errors and recovery](docs/error-handling.md)

## Typed events and generated hooks

`createChannelEventHooks` maps an event name to its channel and payload types. Applications supply the decoder for their publication format.

The optional `@priemskiyyy/simulcast-codegen` package generates named hooks such as `useMessageCreated` from that map. Set its `runtime` to `react-centrifugo` so generated hooks import from here. Generated hooks reference the original payload types. The CLI includes `generate`, `check`, and `watch` commands.

[Typed event guide](docs/typed-events.md) · [Code generation](docs/codegen.md)

## Examples

`examples/react` and `examples/expo` are the same dashboard, on the web and on
React Native. Both need a Centrifugo server, since this package only ever builds
a Centrifugo client.

```sh
pnpm --filter example-react dev
pnpm --filter example-expo dev
```

## Packages

| Package            | Directory                                |
| ------------------ | ---------------------------------------- |
| `react-centrifugo` | [React hooks](packages/react-centrifugo) |

This repository publishes one package. Code generation and devtools come from
`@priemskiyyy/simulcast-codegen` and `@priemskiyyy/simulcast-devtools`.

The package is ESM and has no React DOM dependency. It runs on React Native: the repository ships an Expo example that exports iOS and Android bundles. See [server rendering and platform support](docs/server-rendering.md).

The runtime's architecture, adapter contract, and design principles are documented at [priemskiyyy.github.io/simulcast](https://priemskiyyy.github.io/simulcast/).

## Development

Use Node 22.18 or newer and the pnpm version declared in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` builds the package and checks types, lint, formatting, unit tests, generated files, the example app, and an isolated package consumer.

For browser tests, start Docker and install the test browsers:

```sh
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
```

These tests run the built runtime against a pinned Centrifugo server. They cover authentication, token refresh, account replacement, recovery, and repeated cleanup in Chromium, Firefox, and WebKit.

| Command                   | Purpose                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `pnpm dev:docs`           | Run the documentation site.                                        |
| `pnpm build:docs`         | Build documentation and check internal links.                      |
| `pnpm test:unit`          | Run the hook and provider unit tests.                              |
| `pnpm test:compatibility` | Check the runtime tarball with minimum and current React versions. |
| `pnpm check:release`      | Run the complete local release checks.                             |

See [CONTRIBUTING.md](CONTRIBUTING.md) for source conventions and [RELEASING.md](RELEASING.md) for release instructions.

## License

[MIT](LICENSE)
