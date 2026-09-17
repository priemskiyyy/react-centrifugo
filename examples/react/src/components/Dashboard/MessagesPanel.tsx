import type React from "react";
import { ChatsCircle, Users } from "@phosphor-icons/react";
import { Badge } from "src/components/Badge/Badge";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { Panel } from "src/components/Panel/Panel";
import { formatRelativeTime } from "example-shared";
import type { Message } from "example-shared";
import { useNow } from "src/hooks/useNow";

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
          {online} online
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
        <ol className="flex flex-col gap-3 overflow-auto">
          {messages.map((message) => (
            <li key={message.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
              >
                {message.author.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium">{message.author}</span>
                  <time
                    dateTime={message.sentAt}
                    className="text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    {formatRelativeTime(message.sentAt, now)}
                  </time>
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {message.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
};
