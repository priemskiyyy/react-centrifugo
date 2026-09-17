import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

const subscribe = (onChange: () => void) => {
  const subscription = AppState.addEventListener("change", onChange);
  return () => subscription.remove();
};
const getSnapshot = () => AppState.currentState !== "background";
const getServerSnapshot = () => true;

/** Release the session and pause simulated traffic while the app is in the background. */
export const useAppActive = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
