import type { ConnectionState } from "react-centrifugo";
import { match } from "ts-pattern";
import type { AlertSeverity, DeployStage, Metric, MetricName } from "./schemas";

export const formatConnectionState = (state: ConnectionState) => {
  const LABELS: Record<ConnectionState, string> = {
    connected: "Connected",
    connecting: "Connecting",
    disconnected: "Disconnected",
  };

  return LABELS[state];
};

export const formatMetricName = (name: MetricName) => {
  const LABELS: Record<MetricName, string> = {
    latency: "Latency",
    throughput: "Throughput",
    errors: "Error rate",
  };

  return LABELS[name];
};

export const formatMetricValue = ({ name, value }: Metric) =>
  match(name)
    .with("latency", () => `${Math.round(value)} ms`)
    .with("throughput", () => `${Math.round(value)} rps`)
    .with("errors", () => `${value.toFixed(2)} %`)
    .exhaustive();

export const formatSeverity = (severity: AlertSeverity) => {
  const LABELS: Record<AlertSeverity, string> = {
    INFO: "Info",
    WARNING: "Warning",
    CRITICAL: "Critical",
  };

  return LABELS[severity];
};

export const formatStage = (stage: DeployStage) => {
  const LABELS: Record<DeployStage, string> = {
    BUILDING: "Building",
    TESTING: "Testing",
    SHIPPING: "Shipping",
    LIVE: "Live",
  };

  return LABELS[stage];
};

const UNITS = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 3_600, divisor: 60, unit: "minute" },
  { limit: 86_400, divisor: 3_600, unit: "hour" },
] as const satisfies ReadonlyArray<{
  limit: number;
  divisor: number;
  unit: Intl.RelativeTimeFormatUnit;
}>;
const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "just now", "3 minutes ago", and so on; anything older than a day falls back to days. */
export const formatRelativeTime = (iso: string, now: number) => {
  const elapsedSeconds = Math.max(0, (now - Date.parse(iso)) / 1_000);

  if (elapsedSeconds < 5) {
    return "just now";
  }

  const unit = UNITS.find((candidate) => elapsedSeconds < candidate.limit);

  if (unit === undefined) {
    return formatter.format(-Math.floor(elapsedSeconds / 86_400), "day");
  }

  return formatter.format(
    -Math.floor(elapsedSeconds / unit.divisor),
    unit.unit,
  );
};
