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
`useChannelStatus(channel).error`. The runtime passes the provider's error
through untyped, as `{ error: unknown }`, so narrow it before reading fields:

```tsx
const { error } = useChannelStatus(channel);
const reason =
  typeof error?.error === "object" &&
  error.error !== null &&
  "error" in error.error
    ? error.error.error
    : null;
```

The error stays set until the channel subscribes successfully.

## Reconnects

The SDK owns reconnecting. A temporary transport loss does not tear down
subscriptions or lose recovery positions, and nothing in this library reacts to
connection events by disposing anything. When the socket comes back, the
existing subscriptions resume.

This library never stores publications and guarantees no delivery.

## Recovering missed publications

Centrifugo can replay publications you missed while disconnected. Whether it
managed to is reported on the channel status:

```tsx
const { recovered, state } = useChannelStatus("rooms:demo");

useEffect(() => {
  if (state !== "subscribed") {
    return;
  }

  if (recovered) {
    return;
  }

  refetchRoom();
}, [state, recovered]);
```

`recovered` is `false` on a first subscription as well as after a failed
recovery, so it reports the absence of a guarantee rather than proof of loss.
Refetch when it is `false` and the channel is subscribed.

The SDK's own context carries more detail, including whether a resubscribe was
even attempting recovery:

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

`@priemskiyyy/simulcast-codegen` separates problems with your project from bugs
in the tool:

- A **`CodegenFailure`** prints one line and exits 1. That covers an unreadable
  configuration, an event map that cannot be enumerated, and files that cannot
  be written.
- Anything else prints a full stack, because it is a bug worth reporting.

The same split is available programmatically; `CodegenFailure` is exported. See
[Code generation](codegen.md).
