import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";

/** Reads the provider's latest configuration. */
export type ConfigurationSource = {
  get: () => CentrifugeConfiguration;
};
