import type React from "react";
import { Terminal } from "@phosphor-icons/react";

const EXAMPLES = [
  {
    channel: "rooms:demo",
    envelope: {
      name: "message.created",
      body: {
        id: "1",
        author: "Ada",
        text: "Hello from Centrifugo",
        sentAt: "2026-09-17T10:00:00.000Z",
      },
    },
  },
  {
    channel: "metrics",
    envelope: { name: "metric.reported", body: { name: "latency", value: 42 } },
  },
  {
    channel: "deploys",
    envelope: {
      name: "deploy.progressed",
      body: { service: "api", stage: "TESTING", percent: 60 },
    },
  },
] as const;

/** Nothing arrives until a server publishes, so the payloads it expects are on screen. */
export const PublishHint: React.FunctionComponent = () => (
  <details className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm dark:border-zinc-700">
    <summary className="flex cursor-pointer items-center gap-2 font-medium">
      <Terminal size={16} weight="duotone" />
      Publish something
    </summary>
    <p className="mt-3 text-zinc-600 dark:text-zinc-400">
      This dashboard reads a Centrifugo server. Allow the channels below, then
      publish an envelope on each. Every publication is{" "}
      <code>{"{ name, body }"}</code>; the event map decides which hook receives
      it.
    </p>
    <ul className="mt-3 flex flex-col gap-3">
      {EXAMPLES.map(({ channel, envelope }) => (
        <li key={channel}>
          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {channel}
          </p>
          <pre className="mt-1 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
            {JSON.stringify(envelope, null, 2)}
          </pre>
        </li>
      ))}
    </ul>
  </details>
);
