# Configuration

The provider takes one `configuration` object:

```ts
type CentrifugeConfiguration = {
  session: { id: string; enabled?: boolean };
  transport: ConstructorParameters<typeof Centrifuge>[0];
  options?: ConstructorParameters<typeof Centrifuge>[1];
  getSubscriptionOptions?: (channel: string) => SubscriptionOptions;
};
```

`options` and the result of `getSubscriptionOptions` use Centrifuge's own option
types. Token and data callbacks are wrapped to read current configuration and
discard results after cleanup. Other options are passed through.

## Sessions

A session is one Centrifuge client and everything attached to it.

`session.id` decides **when the client is replaced**. Change it and the provider
tears down the old client and builds a new one, reattaching every channel that
still has consumers. Children stay mounted and keep their state, which is why
this is a prop rather than a React `key`.

Most applications key it on whatever invalidates the connection:

```tsx
<CentrifugeProvider
  configuration={{
    session: { id: accountId, enabled: isAuthenticated },
    transport: realtimeUrl,
  }}
>
```

`session.enabled` defaults to `true`. Setting it to `false` releases the session:
the client disconnects, subscriptions are removed, and hooks fall back to their
inactive snapshots. Re-enabling builds a fresh session.

Passing a new object literal every render does **not** reconnect. Only
`session.id` and `session.enabled` do.

## What is read when

Configuration is read at two points:

- **`transport` and `options` are read once**, while the client is constructed.
  To change a transport or a structural client option, change `session.id`, or
  disable and re-enable the session.
- **Everything else is read when it is needed.** `getSubscriptionOptions` runs
  each time a channel is acquired. Token and data callbacks run each time the
  SDK asks for credentials, and always see your latest props.

One consequence: whether a callback _exists_ is fixed when its client or
subscription is created. Supply `getToken` from the start and change what it
returns; adding it later to an existing session has no effect until the session
is replaced.

## Authentication

Connection credentials go in `options`, per-channel credentials in
`getSubscriptionOptions`:

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

Return an empty object for channels that need no subscription token. Centrifugo
still applies the connection identity and the server's channel permissions.

When a session ends, credential callbacks belonging to it stop: queued calls are
rejected and late results are discarded, so a released session cannot fetch or
apply fresh credentials. Requests already in flight in your own code are not
cancelled. The library ignores their results.

## Per-hook enabling

`session.enabled` controls the whole client. Individual hooks take their own
`enabled` flag, which affects only that consumer:

```tsx
useChannel("rooms:demo", onMessage, { enabled: isRoomOpen });
```

When the last enabled consumer of a channel unmounts, the native subscription is
removed. Passive status observers do not hold it open. See
[Hooks](hooks.md#usechannelstatus).
