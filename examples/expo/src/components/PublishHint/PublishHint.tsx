import type React from "react";
import { Terminal } from "phosphor-react-native";
import { Text, View } from "react-native";
import { Panel } from "src/components/Panel/Panel";

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
  <Panel title="Publish something" icon={Terminal}>
    <Text className="text-xs text-zinc-600 dark:text-zinc-400">
      This dashboard reads a Centrifugo server. Allow the channels below, then
      publish an envelope on each. Every publication is {"{ name, body }"}; the
      event map decides which hook receives it.
    </Text>
    <View className="mt-3 gap-3">
      {EXAMPLES.map(({ channel, envelope }) => (
        <View key={channel}>
          <Text className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
            {channel}
          </Text>
          <View className="mt-1 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-950">
            <Text className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
              {JSON.stringify(envelope, null, 2)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  </Panel>
);
