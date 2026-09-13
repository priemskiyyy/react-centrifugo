# Documentation

These pages are published as a site with VitePress; run `pnpm dev:docs` to read
them locally. This file is the index for browsing the repository on GitHub.

React hooks for Centrifugo. One provider owns a client; every consumer of the
same channel shares a single subscription.

## Guides

| Page                                     | What it covers                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| [Getting started](getting-started.md)    | Install, mount the provider, receive your first publication            |
| [Configuration](configuration.md)        | Sessions, reconnecting, transports, connection and subscription tokens |
| [Hooks](hooks.md)                        | Reference for every exported hook and type                             |
| [Typed events](typed-events.md)          | Event maps, decoders, and one subscription per channel                 |
| [Code generation](codegen.md)            | The optional CLI that turns an event map into named hooks              |
| [Server rendering](server-rendering.md)  | SSR, React Server Components, hydration, React Native                  |
| [Errors and recovery](error-handling.md) | Where failures surface, reconnects, and recovering missed publications |

## Internals

Design notes for contributors, not API documentation.

- [Runtime architecture](internals/architecture.md): ownership, subscription flow, event delivery, cleanup ordering
- [Subscription review](internals/subscription-review.md): a dated record of the design changes and their regression coverage

## Packages

- `react-centrifugo`: the runtime. React `>=19.2 <20`, Centrifuge JS `>=5.7.2 <6`, both peer dependencies.
- `react-centrifugo-codegen`: optional. Node `>=22.18`, TypeScript `>=5.8 <6`.
