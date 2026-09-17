import type React from "react";
import type { Icon } from "@phosphor-icons/react";

type EmptyStateProps = {
  icon: Icon;
  title: string;
  description: string;
};

export const EmptyState: React.FunctionComponent<EmptyStateProps> = ({
  icon: EmptyIcon,
  title,
  description,
}) => (
  <div className="m-auto flex max-w-xs flex-col items-center gap-2 py-8 text-center">
    <EmptyIcon size={28} weight="thin" className="text-zinc-400" />
    <p className="text-sm font-medium">{title}</p>
    <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
  </div>
);
