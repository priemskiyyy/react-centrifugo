import { createContext } from "react";
import type { RealtimeClient } from "@priemskiyyy/simulcast";
import type { Centrifuge, PublicationContext, Subscription } from "centrifuge";

/** The provider builds the client, so its native types are known here. */
export type CentrifugeRealtimeClient = RealtimeClient<
  Centrifuge,
  PublicationContext,
  Subscription
>;

export const RealtimeClientContext = createContext<
  CentrifugeRealtimeClient | undefined
>(undefined);
