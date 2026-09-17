# Mission Control

A dashboard on four shared channels: a room, metrics, alerts, and deploys. Six
generated event hooks read one envelope shape, every payload is parsed with Zod,
and the Simulcast devtools panel is mounted.

```sh
pnpm --filter example-react dev
```

This package only ever builds a Centrifugo client, so the dashboard stays empty
until a server publishes.

## Run a Centrifugo for it

The example subscribes to `rooms:<room>`, `metrics`, `alerts`, and `deploys`.
Centrifugo reads `rooms:demo` as the `rooms` namespace, which has to exist, and
anonymous clients need permission on both. This configuration is enough for
local use and for nothing else:

```json
{
  "client": {
    "allowed_origins": ["http://localhost:5173"],
    "allow_anonymous_connect_without_token": true,
    "insecure": true
  },
  "channel": {
    "without_namespace": {
      "allow_subscribe_for_anonymous": true,
      "allow_publish_for_anonymous": true
    },
    "namespaces": [
      {
        "name": "rooms",
        "allow_subscribe_for_anonymous": true,
        "allow_publish_for_anonymous": true
      }
    ]
  },
  "http_api": { "key": "demo-api-key" }
}
```

```sh
docker run --rm -p 8000:8000 -v "$PWD/config.json:/centrifugo/config.json:ro" \
  centrifugo/centrifugo:v6.9.5 centrifugo -c /centrifugo/config.json
```

Press **Connect**, then publish through Centrifugo's HTTP API:

```sh
curl -X POST http://localhost:8000/api/publish \
  -H "X-API-Key: demo-api-key" -H "Content-Type: application/json" \
  -d '{"channel":"rooms:demo","data":{"name":"message.created","body":{"id":"m1","author":"ada","text":"First message","sentAt":"2026-01-01T00:00:00.000Z"}}}'
```

The panel at the bottom of the screen lists an envelope for every event.

## What to try

1. **Add listeners.** Each one is another consumer of the same channel. The
   channel opens one native subscription and the count rises beside it.
2. **Remove every listener and unmount the dashboard.** The channel reports
   `detached`, because the last consumer released the subscription.
3. **Change the room.** The old room's subscription goes; metrics, alerts, and
   deploys keep theirs.
4. **Disconnect and reconnect.** The session is released and rebuilt, and
   consumers reattach.
5. **Open the devtools panel** to watch channels, listener counts, and the event
   timeline while you do any of the above.
