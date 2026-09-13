---
layout: home
hero:
  name: React Centrifugo
  text: React hooks for Centrifugo
  tagline: Shared channel subscriptions, typed events, and automatic cleanup.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Hook reference
      link: /hooks
    - theme: alt
      text: GitHub
      link: https://github.com/priemskiyyy/react-centrifugo
features:
  - title: Shared subscriptions
    details: Components listening to the same channel share one native subscription. The last event listener releases it.
    link: /hooks
    linkText: Hooks
  - title: Your payload types
    details: Declare a payload type, infer it from a parser, or define an event map for channels carrying several event types.
    link: /typed-events
    linkText: Typed events
  - title: Session ownership
    details: Change the session ID to replace the client. Hooks follow the new session while the SDK handles reconnects and recovery.
    link: /configuration
    linkText: Configuration
---

## Receive a publication

```tsx
import { useChannel } from "react-centrifugo";

type Message = { id: string; text: string };

function Room() {
  useChannel<Message>("rooms:demo", (message) => {
    console.log(message.text);
  });

  return null;
}
```

Mount `Room` inside a `CentrifugeProvider`. The generic declares the expected payload; pass `parse` for runtime validation.

[Set up the provider](/getting-started)

## Generate named event hooks

The optional CLI turns an event map into imports such as `useMessageCreated`. Channel and payload types come from your map, and `check` reports when generated files need updating.

[Set up code generation](/codegen)
