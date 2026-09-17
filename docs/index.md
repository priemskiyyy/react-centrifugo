---
title: React Centrifugo
titleTemplate: Centrifugo hooks for React
description: Centrifugo hooks for React. The native SDK surface on top of the simulcast runtime, with shared subscriptions, typed events, and generated hooks.
---

# React Centrifugo

**Centrifugo hooks for React.**

This package builds a Centrifugo client from one configuration object and hands
its native SDK surface to React. Subscription ownership, sharing, and cleanup
come from [simulcast](https://priemskiyyy.github.io/simulcast/) and its
Centrifugo adapter, so channel hooks are that runtime's own, re-exported here
unchanged.

[Get started](getting-started.md) · [Hooks](hooks.md) ·
[Typed events](typed-events.md) · [Devtools](devtools.md) ·
[GitHub](https://github.com/priemskiyyy/react-centrifugo)

```sh
pnpm add react-centrifugo centrifuge react
```

## Receive a publication

```tsx
import { CentrifugeProvider, useChannel } from "react-centrifugo";

type Message = { text: string };

const Room = () => {
  useChannel<Message>("rooms:demo", (message) => {
    console.log(message.text);
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

Components listening to the same channel share one native subscription. The last
one to leave releases it.

## What this package adds

Centrifugo exposes more than publications. These hooks reach that surface with
the SDK's own types, while the runtime keeps owning the subscription:

| Hook                                                    | Gives you                                   |
| ------------------------------------------------------- | ------------------------------------------- |
| [`useCentrifuge`](hooks.md#usecentrifuge)               | the native `Centrifuge` client              |
| [`useSubscriptionEvent`](hooks.md#usesubscriptionevent) | `join`, `leave`, `subscribed`, and the rest |
| [`useClientEvent`](hooks.md#useclientevent)             | connection level SDK events                 |

Use them for `publish`, `history`, `presence`, `rpc`, and recovery details that
the runtime does not normalize.

## What comes from the runtime

`useChannel`, `useChannelDemand`, `useChannelStatus`, `useConnectionState`, and
`createChannelEventHooks` are re-exported from `@priemskiyyy/simulcast-react`
without changes. Importing them from either package gives the same functions, so
an application can mix both imports freely. Their reference lives in
[simulcast's documentation](https://priemskiyyy.github.io/simulcast/hooks).

Code generation and devtools are shared tools too:
[`@priemskiyyy/simulcast-codegen`](codegen.md) and
[`@priemskiyyy/simulcast-devtools`](devtools.md).
