# Getting started

## Install

```sh
pnpm add react-centrifugo centrifuge react
```

Requires React `>=19.2 <20` and Centrifuge JS `>=5.7.2 <6`. Both are peer
dependencies. The package is ESM with TypeScript declarations.

## Mount the provider

Mount a provider above components that use realtime hooks. Hooks used outside
a provider throw an error.

```tsx
import { CentrifugeProvider } from "react-centrifugo";

export const Application = () => (
  <CentrifugeProvider
    configuration={{
      session: { id: "current-user", enabled: true },
      transport: "ws://localhost:8000/connection/websocket",
    }}
  >
    <Room />
  </CentrifugeProvider>
);
```

`transport` is passed to the Centrifuge constructor unchanged, so anything that
client accepts works here. `session` controls when the client is created and
replaced. See [Configuration](configuration.md).

## Receive publications

```tsx
import { useChannel } from "react-centrifugo";

const Room = () => {
  useChannel("rooms:demo", (message, publication) => {
    console.log(message, publication.offset);
  });

  return null;
};
```

The first argument is the publication payload, the second is Centrifuge's own
publication context: channel, offset, tags, and client info.

Nothing subscribes until a component asks for events. Mounting the provider
opens a connection; mounting `useChannel` opens the subscription. Two components
listening to `rooms:demo` share one native subscription and one native listener.

## Type the payload

`useChannel` types publication data as `unknown` by default. There are two ways
to give the callback a more specific type.

Declare the expected payload type without runtime validation:

```tsx
type Message = { text: string };
useChannel<Message>("rooms:demo", (message) => console.log(message.text));
```

Or parse, and get both a runtime check and an inferred type:

```tsx
useChannel("rooms:demo", (message) => console.log(message.text), {
  parse: messageSchema.parse,
});
```

Parsing only changes the first argument. The publication context is untouched.

## Next

Most applications multiplex several event types over one channel. Describe them
in a map and every event gets its own typed hook, and optionally its own
generated one:

```tsx
useMessageCreated("rooms:demo", (message) => console.log(message.text));
```

- [Typed events](typed-events.md): several event types on one channel
- [Code generation](codegen.md): generate a hook per event
- [Configuration](configuration.md): authentication and sessions
- [Hooks](hooks.md): connection and subscription state
