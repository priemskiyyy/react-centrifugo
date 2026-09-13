# react-centrifugo-codegen

Generate named React hooks from a finite TypeScript event map. Effect handles command parsing, config validation, and scoped watcher cleanup. The TypeScript compiler resolves imported and composed types; generation does not execute your application modules.

[Full documentation](../../docs/README.md)

## Setup

```sh
pnpm add -D react-centrifugo-codegen typescript
```

Requires Node 22.18+ and TypeScript `>=5.8 <6`. Add the runtime package separately.

Create your event map:

```ts
// src/realtime/Events.ts
import type { Message } from "../types/Message.js";

export type Events = {
  "message.created": {
    channel: `rooms:${string}`;
    payload: Message;
  };
};
```

Export `useChannelEvent` from `createChannelEventHooks<Events>({ decode })` in `src/realtime/useChannelEvent.ts`. See the runtime package's README for the decoder contract.

Add `realtime.config.json`:

```json
{
  "$schema": "./node_modules/react-centrifugo-codegen/config.schema.json",
  "events": { "file": "src/realtime/Events.ts", "type": "Events" },
  "dispatcher": {
    "file": "src/realtime/useChannelEvent.ts",
    "export": "useChannelEvent"
  },
  "output": "src/hooks/generated"
}
```

Paths are relative to the configuration file. JSON comments are supported. `tsconfig` optionally selects an explicit project; otherwise the nearest config above the event-map file is used.

```sh
react-centrifugo-codegen generate
react-centrifugo-codegen check
react-centrifugo-codegen watch
```

Every command accepts `--config path/to/config.json`. Omitting the command runs `generate`. Use `--help` for options and shell completions.

Import a generated hook directly:

```tsx
import { useMessageCreated } from "./hooks/generated/useMessageCreated.js";

function Messages() {
  useMessageCreated("rooms:demo", (message, publication) => {
    console.log(message, publication.offset);
  });

  return null;
}
```

Each hook constrains its channel, callback, and optional parser using the source event's types. Updating a DTO updates inference without regenerating its definition. Adding or renaming an event changes the generated files.

## Naming and ownership

`message.created` becomes `useMessageCreated`. Override names when needed:

```json
{ "hookNames": { "message.created": "useNewMessage" } }
```

Names must start with `use` followed by an uppercase letter and contain only letters and digits. Collisions fail before writing files.

The output includes individual hooks, an explicit `index.ts` export file, and `.react-centrifugo-codegen.json`, which records generated filenames. Stale hooks are removed only when listed in the manifest and still carrying the generated header. Handwritten files are preserved. Do not edit generated files or remove their ownership header.

`check` reports drift and exits with code 1 without changing files. Commit generated hooks and the manifest, then run `check` before typechecking in CI. `watch` follows imported event types and config changes; it keeps running after generation errors so the next edit can fix them.

## Programmatic use

```ts
import { generateHooks } from "react-centrifugo-codegen";

const result = generateHooks("realtime.config.json", { check: true });
console.log(result.events, result.changed, result.output);
```

This API is synchronous. Problems with your project throw `CodegenFailure`: an unreadable configuration, an event map that cannot be enumerated, or files that cannot be written. It is exported so you can catch these apart from bugs:

```ts
import { CodegenFailure, generateHooks } from "react-centrifugo-codegen";

try {
  generateHooks("realtime.config.json");
} catch (error) {
  if (error instanceof CodegenFailure) {
    console.error(error.message);
    process.exit(1);
  }

  throw error;
}
```

The CLI makes the same split: a `CodegenFailure` prints as one line, anything else prints a full stack because it is a bug worth reporting. `changed` contains filenames relative to the output directory, including manifest changes.

Event maps must have finite, required string keys and required `channel: string` and `payload` fields. Template-literal channels, imported DTOs, re-exports, and intersections of event maps are supported. Numeric keys, symbol keys, open string-indexed maps, and unions of maps are rejected. Generic maps need defaults for every type argument, or a concrete exported alias such as `type Events = EventMap<Message>`. Generated TypeScript should still be included in your normal typecheck; codegen does not replace it.
