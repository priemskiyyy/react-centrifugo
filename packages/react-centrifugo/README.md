# react-centrifugo

React hooks for Centrifugo. One provider owns a client; consumers of the same channel share a subscription.

[Documentation](https://priemskiyyy.github.io/react-centrifugo/) · [Source](https://github.com/priemskiyyy/react-centrifugo)

## Installation

After publication:

```sh
pnpm add react-centrifugo centrifuge react
```

Requires React `>=19.2 <20` and Centrifuge JS `>=5.7.2 <6`. ESM with TypeScript declarations. React and Centrifuge remain peer dependencies. There is no React DOM or Effect runtime dependency.

## Provider and raw publications

```tsx
import { CentrifugeProvider, useChannel } from "react-centrifugo";

type Message = { id: string; text: string };

function Messages() {
  useChannel<Message>("rooms:demo", (message, publication) => {
    console.log(message.text, publication.offset);
  });

  return null;
}

function Application() {
  return (
    <CentrifugeProvider
      configuration={{
        session: { id: "current-user", enabled: true },
        transport: "ws://localhost:8000/connection/websocket",
      }}
    >
      <Messages />
    </CentrifugeProvider>
  );
}
```

`useChannel` receives `unknown` by default. An explicit generic declares your wire contract; it does not validate incoming data. Supply an optional synchronous parser to validate or transform publications. Its return type is inferred:

```tsx
useChannel("rooms:demo", (message) => console.log(message.text), {
  enabled: isRoomOpen,
  parse: messageSchema.parse,
});
```

The second callback argument is the original publication, including its channel, offset, and any client information. Parsing changes the first argument only.

## Session lifecycle and authentication

Changing `session.id` replaces the client and reattaches active subscriptions. `session.enabled` defaults to `true`; disabling it releases the session. Inline configuration objects do not reconnect the client. Per-hook `enabled` affects that consumer only.

The transport and client options are read once, when the session starts. Change the session ID, or disable and re-enable it, to apply a different transport or client option. Everything else reads the latest configuration at the moment it is needed: `getSubscriptionOptions` runs when a channel is acquired, and token and data callbacks run when the SDK asks for credentials. Whether a callback exists is fixed when its client or subscription is created; supply the callback from the start and change what it returns. Pending credentials from an ended session are discarded.

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
  {children}
</CentrifugeProvider>
```

These are native Centrifuge options. The library assumes no token endpoint, token DTO, channel naming convention, or event envelope. Return empty subscription options for channels that do not require a token.

Your server must authorize the connection and channel subscription. The example channel name does not configure server permissions.

## Typed application events

Define a map and a decoder for your own envelope:

```tsx
import { createChannelEventHooks } from "react-centrifugo";

type Events = {
  "message.created": {
    channel: `rooms:${string}`;
    payload: { id: string; text: string };
  };
};

export const { useChannelEvent } = createChannelEventHooks<Events>({
  decode: (data) => {
    if (typeof data !== "object" || data === null) {
      return null;
    }

    if (
      !("name" in data) ||
      typeof data.name !== "string" ||
      !("body" in data)
    ) {
      return null;
    }

    return { eventType: data.name, payload: data.body };
  },
});

function Messages() {
  useChannelEvent("rooms:demo", "message.created", (message) => {
    console.log(message.text);
  });

  return null;
}
```

Returning `null` ignores an envelope. A hook's parser runs only for matching events and must return that event's payload type. The map declares payload types; use parsers where runtime validation is needed.

The optional `react-centrifugo-codegen` package turns this map into named hooks such as `useMessageCreated`. Generated hooks reference the original payload types and constrain the channel; they do not copy DTO definitions or allow a generic to override an event's payload.

## Other hooks

| Hook                                                          | Behavior                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `useConnectionState(onChange?)`                               | Returns `disconnected`, `connecting`, or `connected`                      |
| `useChannelStatus(channel, onChange?)`                        | Returns `{ state, error }`; reports `detached` until something subscribes |
| `useSubscriptionEvent(channel, event, onEvent, { enabled? })` | Shares a client-side subscription and forwards the native event context   |
| `useClientEvent(event, onEvent)`                              | Listens to native client events, including server-side publications       |
| `useCentrifuge()`                                             | Returns the current native client, or `null` while inactive               |

Status callbacks report changes after registration, not the initial value. Hook callbacks see current render values without recreating subscriptions. Async callbacks are supported, but publications are not serialized behind their completion.

For recovery, inspect `wasRecovering` and `recovered` in `useSubscriptionEvent(channel, "subscribed", callback)`. Refresh application data when recovery fails. The SDK owns reconnects and recovery; this library does not store publications or guarantee delivery.

`useCentrifuge` returns `Centrifuge | null` and re-renders when the client is created, replaced, or released. It returns `null` before session setup, during server rendering, or while the session is disabled. The same client survives connection loss; use `useConnectionState` to observe connection state changes.

```tsx
const client = useCentrifuge();
const send = async (text: string) => {
  if (client === null) {
    return;
  }

  await client.publish("rooms:demo", { text });
};
```

This exposes native methods such as `publish`, `history`, and `presence`. Let the provider manage its connection and hook-owned subscriptions. Direct lifecycle changes to those resources can conflict with mounted hooks.

## Errors and rendering

Hooks require an explicit provider. Server rendering does not create a socket; hydration begins with inactive snapshots. The bundle preserves `"use client"` for React Server Component consumers.

There is no provider-level error-reporting API. Parsers and handlers may report their own errors. Uncaught synchronous exceptions and rejected callback promises are surfaced outside the SDK dispatch chain, preserving delivery to sibling consumers. Event callbacks are outside React rendering, so React error boundaries do not handle these failures.

React Native can use the same hooks and native WebSocket transport; device integration has not yet been verified.
