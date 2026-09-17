import { StrictMode, useActionState, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SimulcastDevtools } from "@priemskiyyy/simulcast-devtools/react";
import "./styles.css";
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
const isPlayground = parameters.has("devtools");
const scenarios = [
  { label: "Happy path", flags: [] },
  { label: "Token refresh", flags: ["refresh"] },
  { label: "Invalid token", flags: ["invalid"] },
];
const activeFlags = ["refresh", "invalid"].filter((flag) =>
  parameters.has(flag),
);
const isCurrentScenario = (flags: string[]) =>
  flags.length === activeFlags.length &&
  flags.every((flag) => activeFlags.includes(flag));
const scenarioHref = (user: string, flags: string[]) => {
  const next = new URLSearchParams({ devtools: "", user });
  for (const flag of flags) {
    next.set(flag, "");
  }
  return `?${next.toString().replaceAll("=&", "&").replace(/=$/, "")}`;
};
const sockets = new Set<WebSocket>();
const clients = new Set<Centrifuge>();
const subscriptions = new Set<Subscription>();

const Publisher = ({ user }: { user: string }) => {
  const [result, publish, pending] = useActionState(
    async (_previous: string, form: FormData) => {
      const text = form.get("message");
      const channel = form.get("channel");

      if (typeof text !== "string" || text.trim() === "") {
        return "Enter a message first.";
      }

      return fetch("/test-api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, data: { text } }),
      })
        .then((response) => {
          if (!response.ok) {
            return "The local server could not publish this message.";
          }

          return "Published. Both consumers receive the same message.";
        })
        .catch(() => "The local server is unavailable.");
    },
    "",
  );

  return (
    <form action={publish}>
      <label>
        Test message{" "}
        <input
          name="message"
          defaultValue="Hello from the realtime playground"
          required
        />
      </label>
      <label>
        Channel{" "}
        <select name="channel">
          <option value={`private:${user}`}>private:{user}</option>
          <option value={`private:${user}-alerts`}>
            private:{user}-alerts
          </option>
        </select>
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Publishing…" : "Publish message"}
      </button>
      <p role="status">{result}</p>
    </form>
  );
};

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
  const [alerts, setAlerts] = useState(false);
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
      {isPlayground ? (
        <label>
          <input
            type="checkbox"
            checked={alerts}
            onChange={(event) => setAlerts(event.target.checked)}
          />
          Alerts channel
        </label>
      ) : null}
      {first ? <Consumer channel={channel} name="first" /> : null}
      {second ? <Consumer channel={channel} name="second" /> : null}
      {alerts ? <Consumer channel={`${channel}-alerts`} name="alerts" /> : null}
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
    <main className={parameters.has("devtools") ? "playground" : undefined}>
      <header>
        <h1>
          {isPlayground
            ? "React Centrifugo playground"
            : "React Centrifugo browser tests"}
        </h1>
        {isPlayground ? (
          <nav aria-label="Scenarios">
            {scenarios.map((scenario) => (
              <a
                key={scenario.label}
                href={scenarioHref(user, scenario.flags)}
                aria-current={
                  isCurrentScenario(scenario.flags) ? "page" : undefined
                }
              >
                {scenario.label}
              </a>
            ))}
          </nav>
        ) : null}
      </header>
      {isPlayground ? <Publisher user={user} /> : null}
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
          {parameters.has("devtools") ? (
            <SimulcastDevtools initialIsOpen maxEvents={100} />
          ) : null}
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
