import { useContext } from "react";
import { RealtimeStoreContext } from "src/context/RealtimeStoreContext";

/**
 * Reads the nearest provider's consumer API and throws when the provider is missing.
 *
 * @example
 * ```ts
 * const store = useRealtimeStore();
 * const getClient = () => store.client.get();
 * ```
 */
export const useRealtimeStore = () => {
  const store = useContext(RealtimeStoreContext);

  if (store === undefined) {
    throw new Error(
      "React Centrifugo hooks must be used within a CentrifugeProvider.",
    );
  }

  return store;
};
