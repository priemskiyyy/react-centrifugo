# React Centrifugo

React hooks for [Centrifugo](https://centrifugal.dev/). Components listening to the same channel share a subscription. The provider handles connection ownership and cleanup; hooks expose publications, typed events, and connection state.

Requires React `>=19.2 <20` and Centrifuge JS `>=5.7.2 <6`. Two optional packages come with it: `react-centrifugo-codegen` generates named hooks from your event map, and `react-centrifugo-devtools` adds a browser panel for connections, channels, and events.

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

| Hook                                                      | Purpose                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `useChannel(channel, handler, options?)`                  | Receive publications; optionally parse their data.                              |
| `useChannelStatus(channel, onChange?)`                    | Observe subscription state and the latest error without opening a subscription. |
| `useConnectionState(onChange?)`                           | Read `disconnected`, `connecting`, or `connected`.                              |
| `useSubscriptionEvent(channel, event, handler, options?)` | Receive native subscription events, including recovery metadata.                |
| `useClientEvent(event, handler)`                          | Receive native client events.                                                   |
| `useCentrifuge()`                                         | Access the current native client, or `null` while the session is inactive.      |

[Hook reference](docs/hooks.md) · [Authentication and sessions](docs/configuration.md) · [Errors and recovery](docs/error-handling.md)

## Typed events and generated hooks

`createChannelEventHooks` maps an event name to its channel and payload types. Applications supply the decoder for their publication format.

The optional `react-centrifugo-codegen` package generates named hooks such as `useMessageCreated` from that map. Generated hooks reference the original payload types. The CLI includes `generate`, `check`, and `watch` commands.

[Typed event guide](docs/typed-events.md) · [Code generation](docs/codegen.md)

## Packages

| Package                     | Directory                                            |
| --------------------------- | ---------------------------------------------------- |
| `react-centrifugo`          | [Runtime and React hooks](packages/react-centrifugo) |
| `react-centrifugo-codegen`  | [Optional code generation CLI](packages/codegen)     |
| `react-centrifugo-devtools` | [Browser devtools panel](packages/devtools)          |

The runtime is ESM and has no React DOM or Effect dependency. React Native device support remains unverified. See [server rendering and platform support](docs/server-rendering.md).

## Development

Use Node 24 and the pnpm version declared in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` builds all packages and checks types, lint, formatting, unit tests, generated files, the example app, and an isolated package consumer.

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
| `pnpm test:unit`          | Run runtime, codegen, and devtools unit tests.                     |
| `pnpm test:compatibility` | Check the runtime tarball with minimum and current React versions. |
| `pnpm check:release`      | Run the complete local release checks.                             |

See [CONTRIBUTING.md](CONTRIBUTING.md) for source conventions and [RELEASING.md](RELEASING.md) for release instructions.

## License

[MIT](LICENSE)
