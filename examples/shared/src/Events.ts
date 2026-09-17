import { z } from "zod";
import type {
  Alert,
  AlertResolution,
  Deploy,
  Message,
  Metric,
  Presence,
} from "./schemas";

/** Every event Mission Control receives, keyed by the Centrifugo event name. */
export type Events = {
  "message.created": { channel: `rooms:${string}`; payload: Message };
  "presence.changed": { channel: `rooms:${string}`; payload: Presence };
  "metric.reported": { channel: "metrics"; payload: Metric };
  "alert.raised": { channel: "alerts"; payload: Alert };
  "alert.resolved": { channel: "alerts"; payload: AlertResolution };
  "deploy.progressed": { channel: "deploys"; payload: Deploy };
};

const envelopeSchema = z.object({ name: z.string(), body: z.unknown() });

/**
 * Centrifugo publications carry no event name of their own, so the application
 * supplies one: every publication is a `{ name, body }` envelope.
 */
export const decodeEnvelope = ({ data }: { data: unknown }) => {
  const parsed = envelopeSchema.safeParse(data);

  if (!parsed.success) {
    return null;
  }

  return { eventType: parsed.data.name, payload: parsed.data.body };
};
