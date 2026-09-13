# Server rendering

## What happens on the server

Server rendering opens no socket. The provider creates its store, but the effect
that starts a session never runs, so hooks render from inactive snapshots:

| Hook                 | Server value                         |
| -------------------- | ------------------------------------ |
| `useConnectionState` | `"disconnected"`                     |
| `useChannelStatus`   | `{ state: "detached", error: null }` |
| `useCentrifuge`      | `null`                               |
| `useChannel`         | nothing; the callback does not run   |

Hydration begins from those same snapshots, so the first client render matches
the server markup. The connection starts afterwards, in an effect.

`useCentrifuge` returns `null` on the server and during the first hydration render.
It re-renders with the native client once the provider starts its session. Guard
against `null` before using client methods in event handlers or effects.

## React Server Components

The published bundle preserves `"use client"`, so the provider and hooks can be
imported from a server component tree without extra configuration. They still
have to be used from client components, because they are stateful and subscribe
to a socket.

## React Native

The same hooks work unchanged. Centrifuge JS uses the platform `WebSocket`,
which React Native provides, so no transport configuration is needed.

Device integration has not been verified yet. Treat React Native as expected to
work rather than known to work, and report anything that does not.
