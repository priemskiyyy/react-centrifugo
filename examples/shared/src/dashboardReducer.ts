import { match } from "ts-pattern";
import type {
  Alert,
  AlertResolution,
  Deploy,
  Message,
  Metric,
  MetricName,
  Presence,
} from "./schemas";

const MESSAGE_LIMIT = 50;

export type MetricReading = { current: number; previous: number | null };

export type DashboardState = {
  messages: Message[];
  online: number;
  metrics: Partial<Record<MetricName, MetricReading>>;
  alerts: Alert[];
  deploys: Deploy[];
};

export type DashboardAction =
  | { type: "MESSAGE_RECEIVED"; message: Message }
  | { type: "PRESENCE_CHANGED"; presence: Presence }
  | { type: "METRIC_REPORTED"; metric: Metric }
  | { type: "ALERT_RAISED"; alert: Alert }
  | { type: "ALERT_RESOLVED"; resolution: AlertResolution }
  | { type: "DEPLOY_PROGRESSED"; deploy: Deploy };

export const initialDashboardState: DashboardState = {
  messages: [],
  online: 0,
  metrics: {},
  alerts: [],
  deploys: [],
};

/** Every realtime event becomes one transition; the UI only renders the result. */
export const dashboardReducer = (
  state: DashboardState,
  action: DashboardAction,
): DashboardState =>
  match(action)
    .with({ type: "MESSAGE_RECEIVED" }, ({ message }) => ({
      ...state,
      messages: [message, ...state.messages].slice(0, MESSAGE_LIMIT),
    }))
    .with({ type: "PRESENCE_CHANGED" }, ({ presence }) => ({
      ...state,
      online: presence.online,
    }))
    .with({ type: "METRIC_REPORTED" }, ({ metric }) => ({
      ...state,
      metrics: {
        ...state.metrics,
        [metric.name]: {
          current: metric.value,
          previous: state.metrics[metric.name]?.current ?? null,
        },
      },
    }))
    .with({ type: "ALERT_RAISED" }, ({ alert }) => ({
      ...state,
      alerts: [
        alert,
        ...state.alerts.filter((existing) => existing.id !== alert.id),
      ],
    }))
    .with({ type: "ALERT_RESOLVED" }, ({ resolution }) => ({
      ...state,
      alerts: state.alerts.filter((alert) => alert.id !== resolution.id),
    }))
    .with({ type: "DEPLOY_PROGRESSED" }, ({ deploy }) => {
      const others = state.deploys.filter(
        (existing) => existing.service !== deploy.service,
      );

      return { ...state, deploys: [...others, deploy] };
    })
    .exhaustive();
