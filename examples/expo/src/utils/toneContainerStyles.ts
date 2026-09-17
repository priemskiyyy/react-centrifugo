import { cva } from "class-variance-authority";
import type { Tone } from "example-shared";
export const toneContainerStyles = cva("", {
  variants: {
    tone: {
      neutral:
        "bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700",
      positive:
        "bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-900",
      warning:
        "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-900",
      danger:
        "bg-rose-50 border-rose-200 dark:bg-rose-950 dark:border-rose-900",
    } satisfies Record<Tone, string>,
  },
});
