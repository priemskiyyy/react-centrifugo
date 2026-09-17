import type React from "react";
import { cva } from "class-variance-authority";
import { DEPLOY_STAGES, formatStage, getStageIndex } from "example-shared";
import type { Deploy, DeployStage } from "example-shared";
import { RocketLaunch } from "phosphor-react-native";
import { Text, View } from "react-native";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { Panel } from "src/components/Panel/Panel";

const deployProgressStyles = cva("h-full rounded-full", {
  variants: { done: { true: "bg-emerald-500", false: "bg-sky-500" } },
});

type DeploysPanelProps = {
  deploys: Deploy[];
};

export const DeploysPanel: React.FunctionComponent<DeploysPanelProps> = ({
  deploys,
}) => (
  <Panel title="Deploys" icon={RocketLaunch}>
    {deploys.length === 0 ? (
      <EmptyState
        icon={RocketLaunch}
        title="Nothing shipping"
        description="deploy.progressed publications move each service through the pipeline."
      />
    ) : (
      <View className="gap-4">
        {deploys.map((deploy) => (
          <DeployPipeline key={deploy.service} deploy={deploy} />
        ))}
      </View>
    )}
  </Panel>
);

type DeployPipelineProps = {
  deploy: Deploy;
};

const DeployPipeline: React.FunctionComponent<DeployPipelineProps> = ({
  deploy,
}) => {
  const currentIndex = getStageIndex(deploy.stage);
  const isDone = (stage: DeployStage) =>
    getStageIndex(stage) < currentIndex || deploy.stage === "LIVE";
  const widthFor = (stage: DeployStage) => {
    if (isDone(stage)) {
      return 100;
    }

    if (stage === deploy.stage) {
      return deploy.percent;
    }

    return 0;
  };

  return (
    <View>
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {deploy.service}
        </Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {`${formatStage(deploy.stage)} · ${deploy.percent}%`}
        </Text>
      </View>
      <View className="flex-row gap-1.5">
        {DEPLOY_STAGES.map((stage) => (
          <View key={stage} className="flex-1">
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={`${deploy.service}: ${formatStage(stage)}`}
              accessibilityValue={{ min: 0, max: 100, now: widthFor(stage) }}
              className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
            >
              <View
                className={deployProgressStyles({ done: isDone(stage) })}
                style={{ width: `${widthFor(stage)}%` }}
              />
            </View>
            <Text className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {formatStage(stage)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
