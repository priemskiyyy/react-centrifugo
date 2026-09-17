import type React from "react";
import { Bell, Info, ShieldCheck, Siren, Warning } from "@phosphor-icons/react";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { Badge } from "src/components/Badge/Badge";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { Panel } from "src/components/Panel/Panel";
import { formatRelativeTime, formatSeverity } from "example-shared";
import type { Alert } from "example-shared";
import { getSeverityTone } from "example-shared";
import { useNow } from "src/hooks/useNow";

type AlertRowProps = {
  alert: Alert;
  now: number;
};

const AlertRow: React.FunctionComponent<AlertRowProps> = ({ alert, now }) => {
  const icon = useMemo(
    () =>
      match(alert.severity)
        .with("INFO", () => Info)
        .with("WARNING", () => Warning)
        .with("CRITICAL", () => Siren)
        .exhaustive(),
    [alert.severity],
  );

  return (
    <li className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <Badge tone={getSeverityTone(alert.severity)} icon={icon}>
        {formatSeverity(alert.severity)}
      </Badge>
      <span className="min-w-0 flex-1 truncate text-sm" title={alert.text}>
        {alert.text}
      </span>
      <time
        dateTime={alert.raisedAt}
        className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400"
      >
        {formatRelativeTime(alert.raisedAt, now)}
      </time>
    </li>
  );
};

type AlertsPanelProps = {
  alerts: Alert[];
};

export const AlertsPanel: React.FunctionComponent<AlertsPanelProps> = ({
  alerts,
}) => {
  const now = useNow(15_000);
  const hasAlerts = alerts.length > 0;

  return (
    <Panel
      title="Alerts"
      icon={Bell}
      aside={
        <Badge tone={hasAlerts ? "warning" : "positive"}>
          {alerts.length} open
        </Badge>
      }
    >
      {hasAlerts ? (
        <ul className="flex flex-col gap-2">
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} now={now} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="All clear"
          description="alert.raised publications stay here until alert.resolved arrives."
        />
      )}
    </Panel>
  );
};
