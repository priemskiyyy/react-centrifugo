# Hooks

Every hook requires a `CentrifugeProvider` above it and throws an error if one
is missing.

This package exports three hooks of its own. They reach Centrifugo's native SDK
surface. The rest are re-exported from `@priemskiyyy/simulcast-react` unchanged,
so importing them from either package gives the same functions.

| Hook                                            | Returns              | Opens a subscription | From         |
| ----------------------------------------------- | -------------------- | -------------------- | ------------ |
| [`useCentrifuge`](#usecentrifuge)               | `Centrifuge \| null` | no                   | this package |
| [`useSubscriptionEvent`](#usesubscriptionevent) | nothing              | yes                  | this package |
| [`useClientEvent`](#useclientevent)             | nothing              | no                   | this package |
| [`useChannel`](#usechannel)                     | nothing              | yes                  | the runtime  |
| [`useChannelDemand`](#usechanneldemand)         | nothing              | yes                  | the runtime  |
| [`useChannelStatus`](#usechannelstatus)         | `ChannelStatus`      | no                   | the runtime  |
| [`useConnectionState`](#useconnectionstate)     | `ConnectionState`    | no                   | the runtime  |

Callbacks always see current render values without recreating the subscription,
so you never need to memoise them. They may be async, but publications are not
queued behind their completion.

## useCentrifuge

```ts
useCentrifuge(): Centrifuge | null
```

The current native client. It re-renders when the client is created, replaced,
or released, and reads `null` before session setup, during server rendering, and
while the session is disabled.

```tsx
const client = useCentrifuge();
const send = async (text: string) => {
  if (client === null) {
    return;
  }

  await client.publish("rooms:demo", { text });
};
```

The same client survives connection loss and reconnects, so this value changes
on session replacement rather than on every transition. Use
[`useConnectionState`](#useconnectionstate) to watch those. Effects that use the
client should list it as a dependency.

Use it for `publish`, `history`, `presence`, and `rpc`. Leave the connection and
hook-owned subscriptions to the provider; changing their lifecycle directly
conflicts with mounted hooks.

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
`state`, `publication`, `join`, and `leave`. It binds to the subscription the
runtime owns and forwards Centrifuge's context untouched.

A native subscription exists only while something demands one, so this hook
demands the channel itself. Listening for `state` on a channel opens a
subscription to it.

Name the context type by importing it from `centrifuge`:

```tsx
import type { SubscribedContext } from "centrifuge";

const handleSubscribed = (context: SubscribedContext) => {
  console.log(context.wasRecovering, context.recovered);
};
useSubscriptionEvent("rooms:demo", "subscribed", handleSubscribed);
```

For the recovery outcome alone, `useChannelStatus(channel).recovered` is
simpler. Reach for this hook when you need the SDK's own context.

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

Listeners attach once the client exists, which is after the provider starts its
session. A transition the SDK emits synchronously during that startup happens
before any listener is attached. Read [`useConnectionState`](#useconnectionstate)
for the current value rather than reconstructing it from events.

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
  console.log(message, publication.native.offset);
});
```

The handler's second argument is the runtime publication:

```ts
type Publication = {
  data: unknown;
  event?: string;
  native: PublicationContext;
};
```

Centrifugo's own `PublicationContext`, with its offset, tags, and client info,
is under `native`. Centrifugo publications carry no provider event name, so
`event` is absent.

`parse` runs on every publication and its return type drives inference. The
explicit generic declares your wire contract instead, and nothing validates it
at runtime. Supplying both requires them to agree.

## useChannelDemand

```ts
useChannelDemand(channel: string, options?: { enabled?: boolean }): void
```

Holds a channel's native subscription open without consuming publications. Use
it when a component watches the subscription through the SDK but reads nothing
through the hooks. A component that already calls `useChannel` needs nothing
extra.

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
  error: { error: unknown } | null;
  recovered: boolean;
};
```

Observing a channel's status does not subscribe to it. A channel nobody has
subscribed to reports `detached`, which is distinct from the SDK's
`unsubscribed`: `detached` means no consumer has opened a subscription, so there
is no SDK state to report. If your status stays `detached`, nothing is demanding
that channel.

`error` carries the provider's own error untyped, so narrow it before reading
fields. [Errors and recovery](error-handling.md) shows the narrowing.

`recovered` reports whether Centrifugo replayed the publications missed since the
last subscription. It is `false` on a first subscription and whenever recovery
did not happen, so treat `false` as a gap to refetch rather than proof of loss.

The optional callback fires on changes after registration; it never replays the
current value. Read the return value for that.

## useConnectionState

```ts
useConnectionState(
  onChange?: (state: ConnectionState) => void | Promise<unknown>,
): "disconnected" | "connecting" | "connected"
```

The client's connection state, or `disconnected` when no session is active.

For transitions with both the old and the new value, use
[`useClientEvent("state", ...)`](#useclientevent).
