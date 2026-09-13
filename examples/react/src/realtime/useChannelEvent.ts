import { createChannelEventHooks } from "react-centrifugo";
import type { Events } from "src/realtime/Events";

export const { useChannelEvent } = createChannelEventHooks<Events>({
  decode: (data) => {
    if (typeof data !== "object") {
      return null;
    }

    if (data === null) {
      return null;
    }

    if (!("name" in data)) {
      return null;
    }

    if (typeof data.name !== "string") {
      return null;
    }

    if (!("body" in data)) {
      return null;
    }

    return { eventType: data.name, payload: data.body };
  },
});
