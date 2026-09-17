import { centrifugo } from "@priemskiyyy/simulcast-centrifugo";
import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";

/**
 * Builds the adapter for one session from the configuration current when that
 * session starts. Callbacks are read once per session, so a provider that
 * passes a new `getSubscriptionOptions` on every render does not reach an
 * existing subscription.
 */
export const createCentrifugoAdapter = (
  configuration: CentrifugeConfiguration,
) => {
  const { transport, options, getSubscriptionOptions } = configuration;

  return centrifugo({
    transport,
    ...(options === undefined ? {} : { options }),
    ...(getSubscriptionOptions === undefined ? {} : { getSubscriptionOptions }),
  });
};
