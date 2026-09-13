import { createContext } from "react";
import type { RealtimeStoreApi } from "src/types/internal/RealtimeStoreApi";

export const RealtimeStoreContext = createContext<RealtimeStoreApi | undefined>(
  undefined,
);
