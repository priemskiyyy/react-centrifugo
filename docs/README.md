# Documentation

These pages are published as a site with VitePress; run `pnpm dev:docs` to read
them locally. This file is the index for browsing the repository on GitHub.

Centrifugo hooks for React. The provider builds a client from one configuration
object; subscription ownership comes from
[simulcast](https://priemskiyyy.github.io/simulcast/) and its Centrifugo
adapter.

## Guides

| Page                                     | What it covers                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| [Getting started](getting-started.md)    | Install, mount the provider, receive your first publication            |
| [Configuration](configuration.md)        | Sessions, reconnecting, transports, connection and subscription tokens |
| [Hooks](hooks.md)                        | Reference for every exported hook and type                             |
| [Typed events](typed-events.md)          | Event maps, decoders, and one subscription per channel                 |
| [Code generation](codegen.md)            | The shared CLI that turns an event map into named hooks                |
| [Devtools](devtools.md)                  | The shared channel inspector and event timeline                        |
| [Server rendering](server-rendering.md)  | SSR, React Server Components, hydration, React Native                  |
| [Errors and recovery](error-handling.md) | Where failures surface, reconnects, and recovering missed publications |

## Packages

- `react-centrifugo`: the hooks. React `>=19.2 <20`, Centrifuge JS `>=5.7.2 <6`,
  both peer dependencies. Built on `@priemskiyyy/simulcast`,
  `@priemskiyyy/simulcast-react`, and `@priemskiyyy/simulcast-centrifugo`.

Two shared tools cover the rest and are installed from npm:

- `@priemskiyyy/simulcast-codegen`: optional. Node `>=22.18`, TypeScript
  `>=5.8 <6`.
- `@priemskiyyy/simulcast-devtools`: optional. Reads the runtime, so it needs no
  Centrifugo-specific build.

The runtime's own architecture, adapter contract, and design principles are
documented at
[priemskiyyy.github.io/simulcast](https://priemskiyyy.github.io/simulcast/).
