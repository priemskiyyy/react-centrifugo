# Errors and recovery

## Where failures surface

There is no provider-level error callback. Failures surface where they happen.

**Missing provider.** Any hook used outside a `CentrifugeProvider` throws during
render, so a React error boundary catches it.

**Your callbacks.** Parsers and handlers are yours, and reporting their failures
is too. A synchronous throw or a rejected promise from one consumer is isolated:
siblings still receive the publication, and the SDK's message chain keeps
running. The failure is then thrown in a microtask. In a browser it reaches the
global `error` event, including when the original handler returned a rejected promise.

Because event callbacks run outside React rendering, **error boundaries do not
catch them**. If a handler can fail in a way you care about, handle it there:

```tsx
useChannel("rooms:demo", async (message) => {
  try {
    await save(message);
  } catch (error) {
    reportToSentry(error);
  }
});
```

**Subscription errors.** A channel that fails to subscribe reports it through
`useChannelStatus(channel).error`, which holds Centrifuge's own
`SubscriptionErrorContext`. It stays set until the channel subscribes
successfully.

## Reconnects

The SDK owns reconnecting. A temporary transport loss does not tear down
subscriptions or lose recovery positions, and nothing in this library reacts to
connection events by disposing anything. When the socket comes back, the
existing subscriptions resume.

This library never stores publications and guarantees no delivery. It is a
transport binding, not a cache.

## Recovering missed publications

Centrifugo can replay publications you missed while disconnected. Whether it
managed to is reported on the `subscribed` event:

```tsx
useSubscriptionEvent(
  "rooms:demo",
  "subscribed",
  ({ wasRecovering, recovered }) => {
    if (!wasRecovering) {
      return;
    }

    if (recovered) {
      return;
    }

    refetchRoom();
  },
);
```

`wasRecovering` tells you this was a resubscribe rather than a first
subscription; `recovered` tells you whether the gap was filled. **When recovery
fails, refetch from your API.** The missed publications are gone.

## Codegen failures

`react-centrifugo-codegen` separates problems with your project from bugs in the
tool:

- A **`CodegenFailure`** prints one line and exits 1. That covers an unreadable
  configuration, an event map that cannot be enumerated, and files that cannot
  be written.
- Anything else prints a full stack, because it is a bug worth reporting.

The same split is available programmatically; `CodegenFailure` is exported. See
[Code generation](codegen.md).
