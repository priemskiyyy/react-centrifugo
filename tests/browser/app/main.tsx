import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Centrifuge, Subscription, SubscriptionEvents } from "centrifuge";
import {
  CentrifugeProvider,
  useCentrifuge,
  useChannel,
  useChannelStatus,
  useClientEvent,
  useConnectionState,
  useSubscriptionEvent,
} from "react-centrifugo";

const parameters = new URLSearchParams(location.search);
const initialUser = parameters.get("user") ?? "browser-test";
const refresh = parameters.has("refresh");
const invalid = parameters.has("invalid");
const sockets = new Set<WebSocket>();
const clients = new Set<Centrifuge>();
const subscriptions = new Set<Subscription>();

class ObservedWebSocket extends WebSocket {
  constructor(url: string | URL, protocols?: string | string[]) {
    super(url, protocols);
    sockets.add(this);
    this.addEventListener("close", () => sockets.delete(this), { once: true });
  }
}

const token = async (
  kind: "connection" | "subscription",
  user: string,
  channel?: string,
) => {
  const response = await fetch(`/test-api/${kind}-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, channel, refresh, invalid }),
  });
  if (!response.ok) throw new Error("Test token request failed");
  const body: { token: string } = await response.json();
  return body.token;
};

const Consumer = ({ channel, name }: { channel: string; name: string }) => {
  const [messages, setMessages] = useState<string[]>([]);
  useChannel<{ text: string }>(channel, (message) =>
    setMessages((previous) => [...previous, message.text]),
  );
  return <output data-testid={name}>{JSON.stringify(messages)}</output>;
};

const Session = ({ user }: { user: string }) => {
  const channel = `private:${user}`;
  const [first, setFirst] = useState(true);
  const [second, setSecond] = useState(true);
  const [recoveries, setRecoveries] = useState<
    Array<{ wasRecovering: boolean; recovered: boolean }>
  >([]);
  const [error, setError] = useState("");
  const connection = useConnectionState();
  const status = useChannelStatus(channel);
  const client = useCentrifuge();
  useClientEvent("disconnected", ({ reason }) => setError(reason));
  useSubscriptionEvent(
    channel,
    "subscribed",
    ({ wasRecovering, recovered }) => {
      setRecoveries((previous) => [...previous, { wasRecovering, recovered }]);
    },
    { enabled: first || second },
  );
  useEffect(() => {
    if (client === null) return;
    clients.add(client);
  }, [client]);

  return (
    <section>
      <output data-testid="connection">{connection}</output>
      <output data-testid="channel">{status.state}</output>
      <output data-testid="client">
        {client === null ? "inactive" : "active"}
      </output>
      <output data-testid="error">{error}</output>
      <output data-testid="recoveries">{JSON.stringify(recoveries)}</output>
      <label>
        <input
          type="checkbox"
          checked={first}
          onChange={(event) => setFirst(event.target.checked)}
        />
        First consumer
      </label>
      <label>
        <input
          type="checkbox"
          checked={second}
          onChange={(event) => setSecond(event.target.checked)}
        />
        Second consumer
      </label>
      {first && <Consumer channel={channel} name="first" />}
      {second && <Consumer channel={channel} name="second" />}
    </section>
  );
};

const Application = () => {
  const [user, setUser] = useState(initialUser);
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [diagnostics, setDiagnostics] = useState("");
  const inspect = () => {
    for (const client of clients) {
      for (const subscription of Object.values(client.subscriptions()))
        subscriptions.add(subscription);
    }
    const active = [...clients].filter(
      (client) => client.state !== "disconnected",
    );
    const subscriptionEvents: Array<keyof SubscriptionEvents> = [
      "state",
      "error",
      "publication",
      "subscribed",
      "subscribing",
      "unsubscribed",
      "join",
      "leave",
    ];
    setDiagnostics(
      JSON.stringify({
        sockets: sockets.size,
        clients: active.length,
        subscriptions: [...clients].reduce(
          (total, client) => total + Object.keys(client.subscriptions()).length,
          0,
        ),
        publicationListeners: [...subscriptions].reduce(
          (total, subscription) =>
            total + subscription.listeners("publication").length,
          0,
        ),
        releasedClientListeners: [...clients]
          .filter((client) => !active.includes(client))
          .map(
            (client) =>
              client.listeners("state").length +
              client.listeners("disconnected").length,
          ),
        releasedSubscriptionListeners: [...subscriptions]
          .filter((subscription) => subscription.state === "unsubscribed")
          .map((subscription) =>
            subscriptionEvents.reduce(
              (total, event) => total + subscription.listeners(event).length,
              0,
            ),
          ),
      }),
    );
  };
  return (
    <main>
      <h1>React Centrifugo browser tests</h1>
      <label>
        User
        <input
          aria-label="User"
          value={user}
          onChange={(event) => setUser(event.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Session enabled
      </label>
      <label>
        <input
          type="checkbox"
          checked={mounted}
          onChange={(event) => setMounted(event.target.checked)}
        />
        Provider mounted
      </label>
      <button onClick={inspect}>Inspect resources</button>
      <output data-testid="diagnostics">{diagnostics}</output>
      {mounted && (
        <CentrifugeProvider
          configuration={{
            session: { id: user, enabled },
            transport: `ws://${location.host}/connection/websocket`,
            options: {
              websocket: ObservedWebSocket,
              getToken: () => token("connection", user),
              minReconnectDelay: 2_000,
              maxReconnectDelay: 2_000,
            },
            getSubscriptionOptions: (channel) => ({
              getToken: () => token("subscription", user, channel),
            }),
          }}
        >
          <Session user={user} />
        </CentrifugeProvider>
      )}
    </main>
  );
};

const root = document.getElementById("root");
if (root === null) throw new Error("Missing test app root");
createRoot(root).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
