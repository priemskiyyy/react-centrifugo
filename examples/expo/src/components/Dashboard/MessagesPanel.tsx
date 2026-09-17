import type React from "react";
import { formatRelativeTime } from "example-shared";
import type { Message } from "example-shared";
import { ChatsCircle, Users } from "phosphor-react-native";
import { Text, View } from "react-native";
import { Badge } from "src/components/Badge/Badge";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { Panel } from "src/components/Panel/Panel";
import { useNow } from "src/hooks/useNow";

const VISIBLE_MESSAGES = 8;

type MessagesPanelProps = {
  roomId: string;
  messages: Message[];
  online: number;
};

export const MessagesPanel: React.FunctionComponent<MessagesPanelProps> = ({
  roomId,
  messages,
  online,
}) => {
  const now = useNow(15_000);

  return (
    <Panel
      title={`rooms:${roomId}`}
      icon={ChatsCircle}
      aside={
        <Badge tone="neutral" icon={Users}>
          {`${online} online`}
        </Badge>
      }
    >
      {messages.length === 0 ? (
        <EmptyState
          icon={ChatsCircle}
          title="No messages yet"
          description="message.created publications on this room appear here, newest first."
        />
      ) : (
        <View className="gap-3">
          {messages.slice(0, VISIBLE_MESSAGES).map((message) => (
            <View key={message.id} className="flex-row gap-3">
              <View className="size-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                <Text className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  {message.author.slice(0, 1)}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {message.author}
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatRelativeTime(message.sentAt, now)}
                  </Text>
                </View>
                <Text className="text-sm text-zinc-700 dark:text-zinc-300">
                  {message.text}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Panel>
  );
};
