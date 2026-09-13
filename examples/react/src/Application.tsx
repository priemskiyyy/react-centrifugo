import { useState } from "react";
import { CentrifugeProvider } from "react-centrifugo";
import { Room } from "src/Room";
import "src/styles.css";

export const Application = () => {
  const [enabled, setEnabled] = useState(false);
  const [endpoint, setEndpoint] = useState(
    "ws://localhost:8000/connection/websocket",
  );
  const [roomId, setRoomId] = useState("demo");

  return (
    <main>
      <h1>React Centrifugo</h1>
      <p>Two generated event hooks share one subscription.</p>
      <label>
        WebSocket endpoint
        <input
          value={endpoint}
          disabled={enabled}
          onChange={(event) => setEndpoint(event.target.value)}
        />
      </label>
      <label>
        Room
        <input
          value={roomId}
          onChange={(event) => setRoomId(event.target.value)}
        />
      </label>
      <button type="button" onClick={() => setEnabled((current) => !current)}>
        {enabled ? "Disconnect" : "Connect"}
      </button>
      <CentrifugeProvider
        configuration={{
          session: { id: endpoint, enabled },
          transport: endpoint,
        }}
      >
        <Room key={roomId} id={roomId} />
      </CentrifugeProvider>
      <p>
        Connect to a Centrifugo server configured to allow this channel, then
        publish:
      </p>
      <pre>
        {JSON.stringify(
          {
            name: "message.created",
            body: { id: "1", text: "Hello from Centrifugo" },
          },
          null,
          2,
        )}
      </pre>
    </main>
  );
};
