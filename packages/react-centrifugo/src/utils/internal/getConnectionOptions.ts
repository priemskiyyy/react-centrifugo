import type { CentrifugeConfiguration } from "src/types/CentrifugeConfiguration";
import type { ResourceScope } from "src/utils/internal/ResourceScope";
import { createScopedCallback } from "src/utils/internal/createScopedCallback";

export const getConnectionOptions = (
  initial: CentrifugeConfiguration["options"],
  configuration: { get: () => Pick<CentrifugeConfiguration, "options"> },
  scope: Pick<ResourceScope, "isActive">,
) => {
  const options = { ...initial };

  // Presence is fixed when the client is created; each call reads the latest.
  if (typeof options.getToken === "function") {
    options.getToken = createScopedCallback((context) => {
      const latest = configuration.get().options;

      if (latest === undefined) {
        return;
      }

      if (typeof latest.getToken !== "function") {
        return;
      }

      return latest.getToken(context);
    }, scope.isActive);
  }

  if (typeof options.getData === "function") {
    options.getData = createScopedCallback(() => {
      const latest = configuration.get().options;

      if (latest === undefined) {
        return;
      }

      if (typeof latest.getData !== "function") {
        return;
      }

      return latest.getData();
    }, scope.isActive);
  }

  return options;
};
