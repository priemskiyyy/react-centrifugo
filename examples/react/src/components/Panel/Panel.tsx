import type React from "react";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

type PanelProps = {
  title: string;
  icon: Icon;
  /** Right-aligned header content, such as a count or a status badge. */
  aside?: ReactNode;
  children: ReactNode;
};

export const Panel: React.FunctionComponent<PanelProps> = ({
  title,
  icon: PanelIcon,
  aside,
  children,
}) => (
  <section
    aria-label={title}
    className="flex min-h-72 flex-col rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70"
  >
    <header className="mb-4 flex items-center gap-2">
      <PanelIcon
        size={18}
        weight="duotone"
        className="text-emerald-600 dark:text-emerald-400"
      />
      <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-600 dark:text-zinc-400">
        {title}
      </h2>
      <div className="ml-auto flex items-center gap-2">{aside}</div>
    </header>
    {children}
  </section>
);
