import type React from "react";
import {
  alertResolutionSchema,
  alertSchema,
  dashboardReducer,
  deploySchema,
  initialDashboardState,
  messageSchema,
  metricSchema,
  presenceSchema,
} from "example-shared";
import { useReducer } from "react";
import { View } from "react-native";
import { AlertsPanel } from "src/components/Dashboard/AlertsPanel";
import { DeploysPanel } from "src/components/Dashboard/DeploysPanel";
import { MessagesPanel } from "src/components/Dashboard/MessagesPanel";
import { MetricsPanel } from "src/components/Dashboard/MetricsPanel";
import { useAlertRaised } from "src/hooks/generated/useAlertRaised";
import { useAlertResolved } from "src/hooks/generated/useAlertResolved";
import { useDeployProgressed } from "src/hooks/generated/useDeployProgressed";
import { useMessageCreated } from "src/hooks/generated/useMessageCreated";
import { useMetricReported } from "src/hooks/generated/useMetricReported";
import { usePresenceChanged } from "src/hooks/generated/usePresenceChanged";

type DashboardProps = {
  roomId: string;
};

/** Six generated hooks share four subscriptions; every payload is parsed before the reducer sees it. */
export const Dashboard: React.FunctionComponent<DashboardProps> = ({
  roomId,
}) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState);

  useMessageCreated(
    `rooms:${roomId}`,
    (message) => dispatch({ type: "MESSAGE_RECEIVED", message }),
    { parse: messageSchema.parse },
  );
  usePresenceChanged(
    `rooms:${roomId}`,
    (presence) => dispatch({ type: "PRESENCE_CHANGED", presence }),
    { parse: presenceSchema.parse },
  );
  useMetricReported(
    "metrics",
    (metric) => dispatch({ type: "METRIC_REPORTED", metric }),
    { parse: metricSchema.parse },
  );
  useAlertRaised(
    "alerts",
    (alert) => dispatch({ type: "ALERT_RAISED", alert }),
    {
      parse: alertSchema.parse,
    },
  );
  useAlertResolved(
    "alerts",
    (resolution) => dispatch({ type: "ALERT_RESOLVED", resolution }),
    { parse: alertResolutionSchema.parse },
  );
  useDeployProgressed(
    "deploys",
    (deploy) => dispatch({ type: "DEPLOY_PROGRESSED", deploy }),
    { parse: deploySchema.parse },
  );

  return (
    <View className="gap-4">
      <MessagesPanel
        roomId={roomId}
        messages={state.messages}
        online={state.online}
      />
      <MetricsPanel metrics={state.metrics} />
      <AlertsPanel alerts={state.alerts} />
      <DeploysPanel deploys={state.deploys} />
    </View>
  );
};
