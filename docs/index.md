---
layout: home
hero:
  name: React Centrifugo
  text: React hooks for Centrifugo
  tagline: Shared channel subscriptions, typed events, generated hooks, and browser devtools.
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
  - title: Generated hooks
    details: The optional CLI turns your event map into named hooks such as useMessageCreated, with channel and payload types inferred from the map.
    link: /codegen
    linkText: Code generation
  - title: Browser devtools
    details: A floating panel shows the connection, every channel with listeners, and a timeline of events with errors highlighted and payloads on demand.
    link: /devtools
    linkText: Devtools
  - title: Server rendering
    details: Hooks render on the server with a stable disconnected state and open connections only after hydration.
    link: /server-rendering
    linkText: Server rendering
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

## Inspect the connection

The optional devtools package adds a floating panel: connection state, every channel with listeners, and a timeline of events with unexpected disconnects highlighted. It observes without creating subscriptions and stays out of production builds.

[Set up devtools](/devtools)
