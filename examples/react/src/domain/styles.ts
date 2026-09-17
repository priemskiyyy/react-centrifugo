import { cva } from "class-variance-authority";
import type { Tone } from "example-shared";

const TONE_CLASSES = {
  neutral:
    "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
  positive:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900",
  warning:
    "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900",
  danger:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-900",
} satisfies Record<Tone, string>;

export const badgeStyles = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
  { variants: { tone: TONE_CLASSES } },
);

export const trendStyles = cva(
  "mb-1 inline-flex size-5 items-center justify-center rounded-full ring-1 ring-inset",
  { variants: { tone: TONE_CLASSES } },
);

export const metricCardStyles = cva("min-w-0 rounded-xl border p-4", {
  variants: {
    empty: {
      true: "border-dashed border-zinc-300 dark:border-zinc-700",
      false: "border-zinc-200 dark:border-zinc-800",
    },
  },
});

export const deployProgressStyles = cva(
  "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
  { variants: { done: { true: "bg-emerald-500", false: "bg-sky-500" } } },
);

export const sessionButtonStyles = cva(
  "h-9 rounded-lg px-4 text-sm font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
  {
    variants: {
      enabled: {
        true: "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
        false: "bg-emerald-600 text-white hover:bg-emerald-500",
      },
    },
  },
);

export const listenerButtonStyles = cva(
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium shadow-sm transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
);
