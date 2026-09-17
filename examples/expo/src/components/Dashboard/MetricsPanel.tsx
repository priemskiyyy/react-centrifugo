import type React from "react";
import { useMemo } from "react";
import type {
  MetricName,
  DashboardState,
  MetricReading,
  Tone,
} from "example-shared";
import {
  Bug,
  ChartLineUp,
  Timer,
  ArrowDown,
  ArrowUp,
  Gauge,
  Minus,
} from "phosphor-react-native";
import type { Icon } from "phosphor-react-native";
import {
  METRIC_NAMES,
  formatMetricName,
  formatMetricValue,
  getMetricTone,
  getMetricTrend,
} from "example-shared";
import { Text, View } from "react-native";
import { match } from "ts-pattern";
import { Panel } from "src/components/Panel/Panel";
import { useScheme } from "src/hooks/useScheme";
import { toneContainerStyles } from "src/utils/toneContainerStyles";
import { cva } from "class-variance-authority";
import clsx from "clsx";
import { getToneColor } from "src/utils/getToneColor";

const metricCardStyles = cva("min-w-0 flex-1 rounded-xl border p-3", {
  variants: {
    empty: {
      true: "border-dashed border-zinc-300 dark:border-zinc-700",
      false: "border-zinc-200 dark:border-zinc-800",
    },
  },
});

type MetricsPanelProps = {
  metrics: DashboardState["metrics"];
};

export const MetricsPanel: React.FunctionComponent<MetricsPanelProps> = ({
  metrics,
}) => (
  <Panel title="Metrics" icon={Gauge}>
    <View className="gap-3 sm:flex-row">
      {METRIC_NAMES.map((name) => (
        <MetricCard key={name} name={name} reading={metrics[name]} />
      ))}
    </View>
  </Panel>
);

type MetricCardProps = {
  name: MetricName;
  reading: MetricReading | undefined;
};

const MetricCard: React.FunctionComponent<MetricCardProps> = ({
  name,
  reading,
}) => {
  const metricIcon = useMemo(
    () =>
      match(name)
        .with("latency", () => Timer)
        .with("throughput", () => ChartLineUp)
        .with("errors", () => Bug)
        .exhaustive(),
    [name],
  );
  const trend = reading === undefined ? null : getMetricTrend(reading);
  const trendIcon = match(trend)
    .with("UP", () => ArrowUp)
    .with("DOWN", () => ArrowDown)
    .with("FLAT", () => Minus)
    .with(null, () => null)
    .exhaustive();

  return (
    <View className={metricCardStyles({ empty: reading === undefined })}>
      <MetricLabel icon={metricIcon}>{formatMetricName(name)}</MetricLabel>
      {reading === undefined || trend === null || trendIcon === null ? (
        <Text className="mt-2 text-xl font-semibold text-zinc-400">–</Text>
      ) : (
        <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMetricValue({ name, value: reading.current })}
          </Text>
          <TrendMark tone={getMetricTone(name, trend)} icon={trendIcon} />
        </View>
      )}
    </View>
  );
};

type MetricLabelProps = {
  icon: Icon;
  children: string;
};

const MetricLabel: React.FunctionComponent<MetricLabelProps> = ({
  icon: LabelIcon,
  children,
}) => (
  <View className="flex-row items-center gap-1.5">
    <LabelIcon size={13} color="#71717a" />
    <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
      {children}
    </Text>
  </View>
);

type TrendMarkProps = {
  tone: Tone;
  icon: Icon;
};

const TrendMark: React.FunctionComponent<TrendMarkProps> = ({
  tone,
  icon: MarkIcon,
}) => {
  const scheme = useScheme();

  return (
    <View
      className={clsx(
        "size-5 items-center justify-center rounded-full border",
        toneContainerStyles({ tone }),
      )}
    >
      <MarkIcon size={10} weight="bold" color={getToneColor(tone, scheme)} />
    </View>
  );
};
