import type { ConnectionState } from "react-centrifugo";
import { P, match } from "ts-pattern";
import type { AlertSeverity, MetricName } from "./schemas";
import type { MetricReading } from "./dashboardReducer";

/** The visual weight a status carries; the styles map it to classes. */
export type Tone = "neutral" | "positive" | "warning" | "danger";

export type MetricTrend = "UP" | "DOWN" | "FLAT";

export const getConnectionTone = (state: ConnectionState): Tone =>
  match(state)
    .with("connected", (): Tone => "positive")
    .with("connecting", (): Tone => "warning")
    .with("disconnected", (): Tone => "neutral")
    .exhaustive();

export const getSeverityTone = (severity: AlertSeverity): Tone =>
  match(severity)
    .with("INFO", (): Tone => "neutral")
    .with("WARNING", (): Tone => "warning")
    .with("CRITICAL", (): Tone => "danger")
    .exhaustive();

export const getMetricTrend = ({
  current,
  previous,
}: MetricReading): MetricTrend => {
  if (previous === null) {
    return "FLAT";
  }

  if (current > previous) {
    return "UP";
  }

  if (current < previous) {
    return "DOWN";
  }

  return "FLAT";
};

/** Rising throughput is good news; rising latency or errors is not. */
export const getMetricTone = (name: MetricName, trend: MetricTrend): Tone =>
  match([name, trend] as const)
    .with([P._, "FLAT"], (): Tone => "neutral")
    .with(["throughput", "UP"], (): Tone => "positive")
    .with(["throughput", "DOWN"], (): Tone => "warning")
    .with(["latency", "UP"], ["errors", "UP"], (): Tone => "danger")
    .with(["latency", "DOWN"], ["errors", "DOWN"], (): Tone => "positive")
    .exhaustive();
