import { useState } from "react";
import {
  useChannelStatus,
  useConnectionState,
  useSubscriptionEvent,
} from "react-centrifugo";
import { useMessageCreated } from "src/hooks/generated/useMessageCreated";
import { usePresenceChanged } from "src/hooks/generated/usePresenceChanged";
import type { Message } from "src/realtime/Events";

export const Room = ({ id }: { id: string }) => {
  const channel = `rooms:${id}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [online, setOnline] = useState(0);
  const [recovery, setRecovery] = useState("No reconnect yet");
  const connection = useConnectionState();
  const status = useChannelStatus(channel);

  useMessageCreated(`rooms:${id}`, (message) => {
    setMessages((current) => [message, ...current].slice(0, 50));
  });

  usePresenceChanged(`rooms:${id}`, (presence) => {
    setOnline(presence.online);
  });

  useSubscriptionEvent(
    channel,
    "subscribed",
    ({ wasRecovering, recovered }) => {
      if (!wasRecovering) {
        return;
      }

      setRecovery(
        recovered
          ? "Recovered missed publications"
          : "Recovery unavailable; refresh your application data",
      );
    },
  );

  return (
    <section aria-labelledby="room-heading">
      <h2 id="room-heading">{channel}</h2>
      <p>
        Connection: {connection} · Subscription: {status.state} · Online:{" "}
        {online}
      </p>
      <p>{recovery}</p>
      {status.error === null ? null : (
        <p role="alert">{status.error.error.message}</p>
      )}
      {messages.length === 0 ? (
        <p>Waiting for a message.created publication.</p>
      ) : (
        <ul>
          {messages.map((message) => (
            <li key={message.id}>{message.text}</li>
          ))}
        </ul>
      )}
    </section>
  );
};
