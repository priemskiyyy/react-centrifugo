import { useColorScheme } from "react-native";

/** The active colour scheme, defaulting to light when the platform reports none. */
export const useScheme = () => (useColorScheme() === "dark" ? "dark" : "light");
