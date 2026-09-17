# Code generation

`@priemskiyyy/simulcast-codegen` reads your [event map](typed-events.md) and
writes one named hook per event. Point its `runtime` at this package and the
generated hooks import from it.

```ts
// you write this once
export type Events = {
  "message.created": { channel: `rooms:${string}`; payload: Message };
};
```

```tsx
// and call this everywhere
useMessageCreated("rooms:demo", (message) => console.log(message.text));
```

## When to generate hooks

`useChannelEvent(channel, "message.created", handler)` already works and is
fully typed. Generated hooks provide named imports for those calls:

- `useMessageCreated` keeps the event map's channel and payload constraints.
- Payload types reference `Events["message.created"]["payload"]`; edits to
  `Message` flow through without regenerating the hook.
- The `check` command reports when generated files differ from the current
  event names or configuration.

The cost is one config file and a command in CI. Everything in
[Typed events](typed-events.md) works without any of it.

## Install

```sh
pnpm add -D @priemskiyyy/simulcast-codegen typescript
```

Node `>=22.18`, TypeScript `>=5.8 <6`.

## Configure

```json
{
  "$schema": "./node_modules/@priemskiyyy/simulcast-codegen/config.schema.json",
  "events": { "file": "src/realtime/Events.ts", "type": "Events" },
  "dispatcher": {
    "file": "src/realtime/useChannelEvent.ts",
    "export": "useChannelEvent"
  },
  "output": "src/hooks/generated",
  "runtime": "react-centrifugo"
}
```

| Field        | Meaning                                                               |
| ------------ | --------------------------------------------------------------------- |
| `events`     | The module and exported type name of your event map                   |
| `dispatcher` | The module and export of your `useChannelEvent`                       |
| `output`     | Directory for generated hooks                                         |
| `runtime`    | The package generated hooks import from. Set it to `react-centrifugo` |
| `imports`    | Optional. `{ "extension": "js" }` or `{ "extension": "none" }`        |
| `tsconfig`   | Optional. Defaults to the nearest config above the event-map file     |
| `hookNames`  | Optional. Overrides for generated names                               |

Without `runtime`, hooks import from the generator's own default binding, which
is not this package. `examples/react/realtime.config.json` is a working
configuration.

Paths are relative to the configuration file, and JSON comments are allowed. The
`$schema` link gives editors completion and validation; it is generated from the
same schema that validates the file at runtime, so the two cannot drift.

Generated hooks import `ChannelInput`, `PublicationHandler`, and
`UseChannelOptions` from the runtime. This package exports all three.

## Run

```sh
simulcast-codegen generate   # write hooks
simulcast-codegen check      # report drift, change nothing, exit 1 if stale
simulcast-codegen watch      # regenerate as types and config change
```

Every command takes `--config path/to/config.json`, and running with no command
is `generate`.

Commit the generated hooks and their manifest, then run `check` in CI before
typechecking. `watch` follows imported event types and the config file, and
keeps running after a generation error so the next edit can fix it.

## Names

`message.created` becomes `useMessageCreated`. Override when you need to:

```json
{ "hookNames": { "message.created": "useNewMessage" } }
```

Names must match `use[A-Z][a-zA-Z0-9]*`. Collisions fail before anything is
written, and are compared case-insensitively because these become filenames and
a case-insensitive filesystem would silently overwrite one hook with another.

## Output and ownership

The output directory holds one file per hook, an `index.ts`, and
`.simulcast-codegen.json` recording what was generated.

A stale hook is deleted only if it is listed in that manifest _and_ still
carries the generated header. Anything else is left alone: if a handwritten file
sits where a hook would go, generation refuses rather than overwriting it. Do
not edit generated files or strip their header. Files written by an earlier
generator carry a different header, so move or delete them before the first run.

## What the event map must be

Finite, required, string keys, each with required `channel: string` and
`payload` fields.

Supported: template-literal channels, imported DTOs, re-exports, intersections
of event maps, and generic maps where every type argument has a default (or a
concrete exported alias such as `type Events = EventMap<Message>`).

Rejected: numeric and symbol keys, open string-indexed maps, unions of maps, and
optional events or fields. Each rejection names the event and the specific
problem.

Generated TypeScript is still ordinary TypeScript, so keep it in your typecheck.
Codegen does not replace it.

## Programmatic use

```ts
import { CodegenFailure, generateHooks } from "@priemskiyyy/simulcast-codegen";

try {
  const result = generateHooks("realtime.config.json", { check: true });
  console.log(result.events, result.changed, result.output);
} catch (error) {
  if (error instanceof CodegenFailure) {
    console.error(error.message);
    process.exit(1);
  }

  throw error;
}
```

Synchronous. `CodegenFailure` means a problem with your project; anything else is
a bug in the tool, which is why it is worth letting through with its stack
intact. `changed` lists filenames relative to `output`, including the manifest.
