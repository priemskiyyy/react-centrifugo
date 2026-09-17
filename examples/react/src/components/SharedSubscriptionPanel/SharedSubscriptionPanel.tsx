import type React from "react";
import { Broadcast, MinusCircle, PlusCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { useChannelStatus } from "react-centrifugo";
import type { ChannelStatus } from "react-centrifugo";
import { Badge } from "src/components/Badge/Badge";
import { Panel } from "src/components/Panel/Panel";
import { messageSchema } from "example-shared";
import { listenerButtonStyles } from "src/domain/styles";
import { useMessageCreated } from "src/hooks/generated/useMessageCreated";

type SharedSubscriptionPanelProps = {
  roomId: string;
  dashboardMounted: boolean;
  onDashboardToggle: () => void;
};

/**
 * Shows the ownership model: every listener on the room shares one native
 * subscription, and the channel detaches only after the last listener leaves.
 * Devtools reports the same counts from the runtime's diagnostics.
 */
export const SharedSubscriptionPanel: React.FunctionComponent<
  SharedSubscriptionPanelProps
> = ({ roomId, dashboardMounted, onDashboardToggle }) => {
  const channel = `rooms:${roomId}`;
  const [listeners, setListeners] = useState(1);
  const status = useChannelStatus(channel);
  const isSubscribed = status.state === "subscribed";

  return (
    <Panel
      title="Shared subscription"
      icon={Broadcast}
      aside={
        <Badge tone={isSubscribed ? "positive" : "neutral"}>
          {status.state}
        </Badge>
      }
    >
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Every listener on <code>{channel}</code> shares one native subscription.
        Add listeners, unmount the dashboard, and follow the channel in
        devtools.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={dashboardMounted}
          onChange={onDashboardToggle}
          className="accent-emerald-600"
        />
        Dashboard panels
      </label>
      <ol className="my-4 flex flex-col gap-2">
        {Array.from({ length: listeners }, (_, index) => (
          <RoomListener key={index} index={index + 1} roomId={roomId} />
        ))}
      </ol>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setListeners((current) => current + 1)}
          className={listenerButtonStyles()}
        >
          <PlusCircle size={14} weight="bold" />
          Add listener
        </button>
        <button
          type="button"
          disabled={listeners === 0}
          onClick={() => setListeners((current) => Math.max(0, current - 1))}
          className={listenerButtonStyles()}
        >
          <MinusCircle size={14} weight="bold" />
          Remove listener
        </button>
        <p className="ml-auto text-sm text-zinc-600 dark:text-zinc-400">
          {listeners} {listeners === 1 ? "listener" : "listeners"} ·{" "}
          {describeSubscription(status.state)}
        </p>
      </div>
    </Panel>
  );
};

type RoomListenerProps = {
  index: number;
  roomId: string;
};

const RoomListener: React.FunctionComponent<RoomListenerProps> = ({
  index,
  roomId,
}) => {
  const [received, setReceived] = useState(0);

  useMessageCreated(
    `rooms:${roomId}`,
    () => setReceived((current) => current + 1),
    { parse: messageSchema.parse },
  );

  return (
    <li className="flex items-center justify-between rounded-lg border border-zinc-200/80 px-3 py-2 text-sm dark:border-zinc-800">
      <span>Listener {index}</span>
      <span className="text-zinc-500 dark:text-zinc-400">
        {received} received
      </span>
    </li>
  );
};

/** `unsubscribed` still owns a native subscription; it has stopped delivering. */
const describeSubscription = (state: ChannelStatus["state"]) => {
  if (state === "detached") {
    return "no native subscription";
  }

  if (state === "subscribed") {
    return "one native subscription";
  }

  return "one native subscription, not delivering";
};
