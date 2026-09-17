import type React from "react";
import { Planet } from "@phosphor-icons/react";
import clsx from "clsx";
import { ConnectionBadge } from "src/components/ConnectionBadge/ConnectionBadge";
import { sessionButtonStyles } from "src/domain/styles";

type HeaderProps = {
  endpoint: string;
  roomId: string;
  enabled: boolean;
  onEndpointChange: (endpoint: string) => void;
  onRoomChange: (roomId: string) => void;
  onSessionToggle: () => void;
};

const FIELD_CLASS_NAME =
  "h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900";

export const Header: React.FunctionComponent<HeaderProps> = ({
  endpoint,
  roomId,
  enabled,
  onEndpointChange,
  onRoomChange,
  onSessionToggle,
}) => (
  <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3">
      <div className="mr-auto flex items-center gap-2">
        <Planet
          size={24}
          weight="duotone"
          className="text-emerald-600 dark:text-emerald-400"
        />
        <h1 className="text-base font-semibold">Mission Control</h1>
        <ConnectionBadge />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <span className="sr-only">WebSocket endpoint</span>
        <input
          aria-label="WebSocket endpoint"
          className={clsx(FIELD_CLASS_NAME, "w-72 font-mono text-xs")}
          value={endpoint}
          disabled={enabled}
          onChange={(event) => onEndpointChange(event.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        Room
        <input
          aria-label="Room"
          className={clsx(FIELD_CLASS_NAME, "w-28")}
          value={roomId}
          onChange={(event) => onRoomChange(event.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={onSessionToggle}
        className={sessionButtonStyles({ enabled })}
      >
        {enabled ? "Disconnect" : "Connect"}
      </button>
    </div>
  </header>
);
