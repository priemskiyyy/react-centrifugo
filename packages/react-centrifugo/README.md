# react-centrifugo

Centrifugo hooks for React. One provider builds a client from a single
configuration object; components consuming the same channel share one native
subscription.

Subscription ownership, sharing, and cleanup come from
[simulcast](https://priemskiyyy.github.io/simulcast/) and its Centrifugo
adapter, so the channel hooks are that runtime's own, re-exported here
unchanged. This package adds the hooks that reach Centrifugo's native SDK
surface.

[Documentation](https://priemskiyyy.github.io/react-centrifugo/) ·
[Source](https://github.com/priemskiyyy/react-centrifugo)

## Install

```sh
pnpm add react-centrifugo centrifuge react
```

Requires React `>=19.2 <20` and Centrifuge JS `>=5.7.2 <6`, both peer
dependencies. The package is ESM with TypeScript declarations and no React DOM
dependency, so it runs on React Native as well as the web.

## Receive a publication

```tsx
import { CentrifugeProvider, useChannel } from "react-centrifugo";

type Message = { text: string };

const Room = () => {
  useChannel<Message>("rooms:demo", (message, publication) => {
    console.log(message.text, publication.native.offset);
  });

  return null;
};

export const Application = () => (
  <CentrifugeProvider
    configuration={{
      session: { id: "current-user" },
      transport: "ws://localhost:8000/connection/websocket",
    }}
  >
    <Room />
  </CentrifugeProvider>
);
```

The first callback argument is the payload, the second is the runtime
publication, with Centrifugo's own context under `native`. The explicit generic
declares your wire contract and validates nothing. Pass `parse` for a runtime
check and an inferred type.

Nothing subscribes until a component asks for events. The last consumer to
unmount releases the native subscription.

## Hooks

Three hooks reach Centrifugo's native SDK surface:

| Hook                                                      | Gives you                                   |
| --------------------------------------------------------- | ------------------------------------------- |
| `useCentrifuge()`                                         | the native client, or `null` while inactive |
| `useSubscriptionEvent(channel, event, handler, options?)` | `join`, `leave`, `subscribed`, and the rest |
| `useClientEvent(event, handler)`                          | connection level SDK events                 |

Use them for `publish`, `history`, `presence`, `rpc`, and recovery detail the
runtime does not normalize. Leave the connection and hook-owned subscriptions to
the provider.

Channel consumption comes from `@priemskiyyy/simulcast-react` and is re-exported
unchanged, so importing from either package gives the same functions:
`useChannel`, `useChannelDemand`, `useChannelStatus`, `useConnectionState`, and
`createChannelEventHooks`.

Callbacks see current render values without recreating a subscription, so they
never need memoising. They may be async, though publications are not queued
behind their completion.

## Sessions and authentication

```tsx
<CentrifugeProvider
  configuration={{
    session: { id: accountId, enabled: isAuthenticated },
    transport: realtimeUrl,
    options: { getToken: getConnectionToken },
    getSubscriptionOptions: (channel) => ({
      getToken: () => getSubscriptionToken(channel),
    }),
  }}
>
```

`session.id` identifies the session: changing it replaces the client and
reattaches active subscriptions. `session.enabled` defaults to `true` and
releases the session when false. A new object literal on every render reconnects
nothing.

The configuration is read when a session starts, so change `session.id` to apply
a different transport, client option, or credential callback. `options` and
`getSubscriptionOptions` are native Centrifuge options; this package assumes no
token endpoint, channel naming convention, or event envelope. Your server
authorizes the connection and the subscription.

## Typed events

`createChannelEventHooks` carries several event types over one channel. You
declare the map and decode your own envelope; the optional
`@priemskiyyy/simulcast-codegen` package turns that map into named hooks such as
`useMessageCreated`. `@priemskiyyy/simulcast-devtools` adds a browser panel for
connections, channels, and events.

[Getting started](https://priemskiyyy.github.io/react-centrifugo/getting-started) ·
[Hooks](https://priemskiyyy.github.io/react-centrifugo/hooks) ·
[Typed events](https://priemskiyyy.github.io/react-centrifugo/typed-events) ·
[Errors and recovery](https://priemskiyyy.github.io/react-centrifugo/error-handling)

## License

[MIT](https://github.com/priemskiyyy/react-centrifugo/blob/main/LICENSE)
