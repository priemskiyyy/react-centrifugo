import * as Haptics from "expo-haptics";

/** Light feedback for every press; the web build has no haptics and resolves silently. */
export const haptic = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
