import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";
import type { ConfigurationSource } from "src/types/internal/ConfigurationSource";

export const createTestSessionConfiguration = (
  configuration: CentrifugeConfiguration,
): ConfigurationSource => ({ get: () => configuration });
