import type { Tone } from "example-shared";

/** Icon colours cannot come from classes, so tones map to one hex per scheme. */
export const getToneColor = (tone: Tone, scheme: "light" | "dark") => {
  const COLORS: Record<Tone, { light: string; dark: string }> = {
    neutral: { light: "#3f3f46", dark: "#d4d4d8" },
    positive: { light: "#047857", dark: "#6ee7b7" },
    warning: { light: "#92400e", dark: "#fcd34d" },
    danger: { light: "#be123c", dark: "#fda4af" },
  };

  return COLORS[tone][scheme];
};
