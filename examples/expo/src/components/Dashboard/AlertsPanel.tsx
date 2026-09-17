import type React from "react";
import { Info, Siren, Warning, Bell, ShieldCheck } from "phosphor-react-native";
import { useMemo } from "react";
import {
  formatRelativeTime,
  formatSeverity,
  getSeverityTone,
} from "example-shared";
import type { Alert } from "example-shared";
import { match } from "ts-pattern";
import { Badge } from "src/components/Badge/Badge";
import { Text, View } from "react-native";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { Panel } from "src/components/Panel/Panel";
import { useNow } from "src/hooks/useNow";

type AlertRowProps = { alert: Alert; now: number };
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
    <View className="gap-2 rounded-xl border border-zinc-200 px-3 py-3 dark:border-zinc-800">
      <View className="flex-row items-center justify-between gap-3">
        <Badge tone={getSeverityTone(alert.severity)} icon={icon}>
          {formatSeverity(alert.severity)}
        </Badge>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatRelativeTime(alert.raisedAt, now)}
        </Text>
      </View>
      <Text className="text-sm text-zinc-900 dark:text-zinc-100">
        {alert.text}
      </Text>
    </View>
  );
};

type AlertsPanelProps = {
  alerts: Alert[];
};

export const AlertsPanel: React.FunctionComponent<AlertsPanelProps> = ({
  alerts,
}) => {
  const now = useNow(15_000);

  return (
    <Panel
      title="Alerts"
      icon={Bell}
      aside={
        <Badge
          tone={alerts.length > 0 ? "warning" : "positive"}
        >{`${alerts.length} open`}</Badge>
      }
    >
      {alerts.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="All clear"
          description="alert.raised publications stay here until alert.resolved arrives."
        />
      ) : (
        <View className="gap-2">
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} now={now} />
          ))}
        </View>
      )}
    </Panel>
  );
};
