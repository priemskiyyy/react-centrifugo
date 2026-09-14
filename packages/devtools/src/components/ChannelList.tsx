import type { RealtimeSnapshot } from "react-centrifugo/devtools";
import { formatCount } from "src/formatting/formatCount";

type ChannelListProps = {
  channels: RealtimeSnapshot["channels"];
  selectedChannel: string | null;
  onSelect: (channel: string | null) => void;
};

export const ChannelList = ({
  channels,
  selectedChannel,
  onSelect,
}: ChannelListProps) => (
  <nav className="rc-channels" aria-label="Realtime channels">
    <button
      type="button"
      className="rc-channel"
      aria-pressed={selectedChannel === null}
      onClick={() => onSelect(null)}
    >
      <span>All channels</span>
      <span className="rc-count">{channels.length}</span>
    </button>
    {channels.map((channel) => (
      <button
        type="button"
        className="rc-channel"
        key={channel.name}
        aria-pressed={selectedChannel === channel.name}
        onClick={() => onSelect(channel.name)}
      >
        <span className="rc-channel-name">
          <span className="rc-dot" data-state={channel.state} />
          {channel.name}
        </span>
        <small>
          {channel.state} ·{" "}
          {formatCount(channel.consumers.events, "event listener")} ·{" "}
          {formatCount(channel.consumers.status, "status observer")}
        </small>
        {channel.error === null ? null : (
          <small className="rc-error">{channel.error.message}</small>
        )}
      </button>
    ))}
    {channels.length === 0 ? (
      <p className="rc-channel-empty">No channel listeners yet.</p>
    ) : null}
  </nav>
);
