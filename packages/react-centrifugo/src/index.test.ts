import { expect, test } from "vitest";
import * as api from "src/index";

test("the package exposes consumer functions without exporting runtime owners", () => {
  expect(Object.keys(api).sort()).toEqual(
    [
      "CentrifugeProvider",
      "createChannelEventHooks",
      "useCentrifuge",
      "useChannel",
      "useChannelStatus",
      "useClientEvent",
      "useConnectionState",
      "useSubscriptionEvent",
    ].sort(),
  );
});
