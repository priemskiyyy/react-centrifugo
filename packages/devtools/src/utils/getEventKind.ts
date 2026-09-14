import type { RealtimeDiagnosticEvent } from "react-centrifugo/devtools";
import { z } from "zod";
import { assertUnreachable } from "src/utils/assertUnreachable";

export type RecordedEventKind =
  "ERROR" | "PUBLICATION" | "LIFECYCLE" | "RUNTIME";

// Codes for transitions the application asked for. Any other code means something failed.
const routineCodes = new Map<string, number[]>([
  ["connecting", [0]],
  ["disconnected", [0]],
  ["unsubscribed", [0, 2]],
]);

const codedContextSchema = z.object({ code: z.number() });

const isUnexpectedTransition = (type: string, value: unknown) => {
  const routine = routineCodes.get(type);
  const parsed = codedContextSchema.safeParse(value);

  if (routine === undefined || !parsed.success) {
    return false;
  }

  return !routine.includes(parsed.data.code);
};

/** `value` is the inspected copy of the event context, never the live SDK object. */
export const getEventKind = (
  event: Pick<RealtimeDiagnosticEvent, "source" | "type">,
  value: unknown,
): RecordedEventKind => {
  if (event.type === "error" || isUnexpectedTransition(event.type, value)) {
    return "ERROR";
  }

  if (event.source === "runtime") {
    return "RUNTIME";
  }

  if (event.source === "client" || event.source === "channel") {
    return event.type === "publication" ? "PUBLICATION" : "LIFECYCLE";
  }

  return assertUnreachable(event.source);
};
