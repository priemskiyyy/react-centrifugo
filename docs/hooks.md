# Hooks

Every hook requires a `CentrifugeProvider` above it and throws an error if
one is missing.

| Hook                                            | Returns              | Opens a subscription |
| ----------------------------------------------- | -------------------- | -------------------- |
| [`useChannel`](#usechannel)                     | nothing              | yes                  |
| [`useChannelStatus`](#usechannelstatus)         | `ChannelStatus`      | no                   |
| [`useConnectionState`](#useconnectionstate)     | `ConnectionState`    | no                   |
| [`useSubscriptionEvent`](#usesubscriptionevent) | nothing              | yes                  |
| [`useClientEvent`](#useclientevent)             | nothing              | no                   |
| [`useCentrifuge`](#usecentrifuge)               | `Centrifuge \| null` | no                   |

Callbacks always see current render values without recreating the subscription,
so you never need to memoise them. They may be async, but publications are not
queued behind their completion.

## useChannel

```ts
useChannel<TData = unknown>(
  channel: string,
  onEvent: PublicationHandler<TData>,
  options?: { enabled?: boolean; parse?: (data: unknown) => TData },
): void
```

Subscribes to a channel and receives its publications.

```tsx
useChannel("rooms:demo", (message, publication) => {
  console.log(message, publication.offset);
});
```

The handler's second argument is `Publication`, which is Centrifuge's own
`PublicationContext` with `data` narrowed from `any` to `unknown`.

`parse` runs on every publication and its return type drives inference. The
explicit generic declares your wire contract instead, and nothing validates it
at runtime. Supplying both requires them to agree.

## useChannelStatus

```ts
useChannelStatus(
  channel: string,
  onChange?: (status: ChannelStatus) => void | Promise<unknown>,
): ChannelStatus
```

```ts
type ChannelStatus = {
  state: "detached" | "unsubscribed" | "subscribing" | "subscribed";
  error: SubscriptionErrorContext | null;
};
```

Observing a channel's status does **not** subscribe to it. A channel nobody has
subscribed to reports `detached`, which is distinct from the SDK's
`unsubscribed`: `detached` means no consumer has opened a subscription, so there
is no SDK state to report. If your status stays `detached`, nothing is calling
`useChannel` for that channel.

The optional callback fires on changes after registration; it never replays the
current value. Read the return value for that.

## useConnectionState

```ts
useConnectionState(
  onChange?: (state: ConnectionState) => void | Promise<unknown>,
): "disconnected" | "connecting" | "connected"
```

The client's connection state, or `disconnected` when no session is active.

For transitions you usually want [`useClientEvent("state", ...)`](#useclientevent)
instead. It reports `newState` and `oldState` rather than only the new value.

## useSubscriptionEvent

```ts
useSubscriptionEvent<TEvent extends keyof SubscriptionEvents>(
  channel: string,
  event: TEvent,
  onEvent: (context: Parameters<SubscriptionEvents[TEvent]>[0]) => void | Promise<unknown>,
  options?: { enabled?: boolean },
): void
```

An escape hatch onto the native subscription events: `subscribed`, `error`,
`state`, `publication`, `join`, and `leave`. It shares the same subscription as
`useChannel` and forwards Centrifuge's context untouched.

Like `useChannel`, this creates demand: listening for `state` on a channel opens
a subscription to it.

Name the context type by importing it from `centrifuge` directly:

```tsx
import type { SubscribedContext } from "centrifuge";

const onSubscribed = (context: SubscribedContext) => {
  console.log(context.wasRecovering, context.recovered);
};
useSubscriptionEvent("rooms:demo", "subscribed", onSubscribed);
```

## useClientEvent

```ts
useClientEvent<TEvent extends keyof ClientEvents>(
  event: TEvent,
  onEvent: (context: Parameters<ClientEvents[TEvent]>[0]) => void | Promise<unknown>,
): void
```

Native client events: `connected`, `disconnected`, `connecting`, `error`,
`state`, and server-side subscription events including server publications.
Client events are global, so this opens nothing.

## useCentrifuge

```ts
useCentrifuge(): Centrifuge | null
```

Returns the current native client and re-renders when it is created, replaced,
or released. The value is `null` before session setup, during server rendering,
or while the session is disabled.

```tsx
const client = useCentrifuge();
const send = async (text: string) => {
  if (client === null) {
    return;
  }

  await client.publish("rooms:demo", { text });
};
```

The same client survives connection loss and reconnects. Use `useConnectionState`
to observe those transitions; `useCentrifuge` updates when client identity changes.
Effects that use the client should include it in their dependency list so they
follow session replacements.

Use it for `publish`, `history`, `presence`, and `rpc`. Leave the connection and
hook-owned subscriptions to the provider; changing their lifecycle directly
conflicts with mounted hooks.
