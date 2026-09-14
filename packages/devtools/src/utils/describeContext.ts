import type { RealtimeDiagnosticEvent } from "react-centrifugo/devtools";
import { formatContextSummary } from "src/formatting/formatContextSummary";
import { formatContextText } from "src/formatting/formatContextText";
import { getEventKind } from "src/utils/getEventKind";
import type { RecordedEventKind } from "src/utils/getEventKind";
import { inspectContext } from "src/utils/inspectContext";

export type DescribedContext = {
  context: string;
  summary: string;
  kind: RecordedEventKind;
};

/** Row text, summary, and kind for one event, computed once at capture time. */
export const describeContext = (
  event: RealtimeDiagnosticEvent,
  capturePayloads: boolean,
): DescribedContext => {
  try {
    const value = inspectContext(event.context, capturePayloads);

    return {
      context: formatContextText(value),
      summary: formatContextSummary(value, capturePayloads),
      kind: getEventKind(event, value),
    };
  } catch {
    return {
      context: "[Unable to inspect this value]",
      summary: "",
      kind: getEventKind(event, null),
    };
  }
};
