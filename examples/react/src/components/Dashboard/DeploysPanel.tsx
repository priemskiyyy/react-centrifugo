import type React from "react";
import { RocketLaunch } from "@phosphor-icons/react";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { Panel } from "src/components/Panel/Panel";
import { formatStage } from "example-shared";
import { DEPLOY_STAGES, getStageIndex } from "example-shared";
import type { Deploy } from "example-shared";
import { deployProgressStyles } from "src/domain/styles";

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
      <ul className="flex flex-col gap-4">
        {deploys.map((deploy) => (
          <li key={deploy.service}>
            <DeployPipeline deploy={deploy} />
          </li>
        ))}
      </ul>
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

  return (
    <div>
      <p className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-mono font-medium">{deploy.service}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatStage(deploy.stage)} · {deploy.percent}%
        </span>
      </p>
      <ol
        className="grid grid-cols-4 gap-1.5"
        aria-label={`${deploy.service} pipeline`}
      >
        {DEPLOY_STAGES.map((stage, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex || deploy.stage === "LIVE";

          return (
            <li key={stage} aria-current={isCurrent ? "step" : undefined}>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={deployProgressStyles({ done: isDone })}
                  style={{
                    width: `${isDone ? 100 : isCurrent ? deploy.percent : 0}%`,
                  }}
                />
              </div>
              <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {formatStage(stage)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
