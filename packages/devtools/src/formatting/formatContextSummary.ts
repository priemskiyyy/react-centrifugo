import { z } from "zod";

// Only the fields the summary reads. Anything that does not parse gets no summary.
const summarizableContextSchema = z.object({
  code: z.number().optional(),
  reason: z.string().optional(),
  error: z
    .object({ code: z.number().optional(), message: z.string() })
    .optional(),
  transport: z.string().optional(),
  wasRecovering: z.boolean().optional(),
  recovered: z.boolean().optional(),
  data: z.unknown().optional(),
  offset: z.number().optional(),
  info: z.object({ user: z.string().optional() }).optional(),
  id: z.string().optional(),
});

const withCode = (text: string, code: number | undefined) =>
  code === undefined || code === 0 ? text : `${text} (${code})`;

/** One-line row text. `value` is the inspected copy of the context. */
export const formatContextSummary = (
  value: unknown,
  capturePayloads: boolean,
) => {
  const parsed = summarizableContextSchema.safeParse(value);

  if (!parsed.success) {
    return "";
  }

  const context = parsed.data;
  const parts: string[] = [];

  if (context.error !== undefined) {
    parts.push(withCode(context.error.message, context.error.code));
  }

  if (context.reason !== undefined) {
    parts.push(withCode(context.reason, context.code));
  }

  if (context.transport !== undefined) {
    parts.push(context.transport);
  }

  if (context.wasRecovering === true) {
    parts.push(context.recovered === true ? "recovered" : "recovery failed");
  }

  if (context.data !== undefined && capturePayloads) {
    parts.push(String(JSON.stringify(context.data)).slice(0, 100));
  }

  if (context.offset !== undefined) {
    parts.push(`offset ${context.offset}`);
  }

  if (context.info?.user !== undefined) {
    parts.push(`user ${context.info.user}`);
  }

  if (context.id !== undefined) {
    parts.push(context.id);
  }

  return parts.join(" · ");
};
