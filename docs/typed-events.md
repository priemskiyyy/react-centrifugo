# Typed events

Use `createChannelEventHooks` when a channel carries several event types.
You define the event map and decode your publication format.

## Declare the map

Each event names the channels it can arrive on and the payload it carries.

```ts
// src/realtime/Events.ts
export type Message = { id: string; text: string };

export type Events = {
  "message.created": {
    channel: `rooms:${string}`;
    payload: Message;
  };
  "presence.changed": {
    channel: `rooms:${string}`;
    payload: { online: number };
  };
};
```

The `channel` type is enforced at the call site, so `useChannelEvent("billing", "message.created", ...)`
is a compile error.

## Write the decoder

The decoder pulls an event name and payload out of one publication. It receives
the whole publication, so destructure `data` for the payload and read `native`
when you need Centrifugo's own context. Return `null` for anything it does not
recognise and that publication is ignored.

```ts
// src/realtime/useChannelEvent.ts
import { createChannelEventHooks } from "react-centrifugo";
import type { Events } from "./Events";

export const { useChannelEvent } = createChannelEventHooks<Events>({
  decode: ({ data }) => {
    if (typeof data !== "object" || data === null) {
      return null;
    }

    if (!("name" in data) || typeof data.name !== "string") {
      return null;
    }

    if (!("body" in data)) {
      return null;
    }

    return { eventType: data.name, payload: data.body };
  },
});
```

The decoder runs for each consumer receiving a publication, before event
matching. Return `null` for unrecognized envelopes. Use a hook's `parse` option
to validate matching payloads.

## Use it

```tsx
useChannelEvent("rooms:demo", "message.created", (message) => {
  console.log(message.text);
});
```

`message` is `Message`, taken from the map. A hook's `parse` runs only for
matching events and must return that event's declared payload type, so parsing
narrows the runtime value without letting it drift from the map.

## One subscription per channel

Every `useChannelEvent` call goes through `useChannel`, so listeners for
different events on the same channel share one native subscription and one
native publication listener.

For expensive decoding shared by many consumers, a single `useChannel` can
decode and distribute the result in application code.

## Turn the map into named hooks

Everything above works on its own. The map also holds enough information to
write the hooks for you:

```tsx
// instead of
useChannelEvent("rooms:demo", "message.created", onMessage);

// generate once, then call
useMessageCreated("rooms:demo", onMessage);
```

The generated hook keeps the same channel and payload constraints as
`useChannelEvent`. It replaces the event-name argument with a named import.
Payload types reference the original event map, so changing a payload's fields
does not require regeneration.

```sh
simulcast-codegen generate
```

[Code generation](codegen.md) covers configuration, the `check` and `watch`
commands, naming overrides, and what the event map must look like.
