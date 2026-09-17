import { useContext } from "react";
import { RealtimeClientContext } from "src/context/RealtimeClientContext";

/** The nearest provider's client, typed with Centrifugo's native values. */
export const useRealtimeClient = () => {
  const client = useContext(RealtimeClientContext);

  if (client === undefined) {
    throw new Error(
      "react-centrifugo hooks must be used within a CentrifugeProvider.",
    );
  }

  return client;
};
