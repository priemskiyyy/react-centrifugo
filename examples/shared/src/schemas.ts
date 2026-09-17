import { z } from "zod";

export const messageSchema = z.object({
  id: z.string(),
  author: z.string().min(1),
  text: z.string().min(1),
  sentAt: z.iso.datetime(),
});

export const presenceSchema = z.object({
  online: z.number().int().nonnegative(),
});

export const METRIC_NAMES = ["latency", "throughput", "errors"] as const;

export const metricSchema = z.object({
  name: z.enum(METRIC_NAMES),
  value: z.number().nonnegative(),
});

export const ALERT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;

export const alertSchema = z.object({
  id: z.string(),
  severity: z.enum(ALERT_SEVERITIES),
  text: z.string().min(1),
  raisedAt: z.iso.datetime(),
});

export const alertResolutionSchema = z.object({ id: z.string() });

export const DEPLOY_STAGES = [
  "BUILDING",
  "TESTING",
  "SHIPPING",
  "LIVE",
] as const;

export const deploySchema = z.object({
  service: z.string().min(1),
  stage: z.enum(DEPLOY_STAGES),
  percent: z.number().int().min(0).max(100),
});

export type Message = z.infer<typeof messageSchema>;
export type Presence = z.infer<typeof presenceSchema>;
export type Metric = z.infer<typeof metricSchema>;
export type MetricName = Metric["name"];
export type Alert = z.infer<typeof alertSchema>;
export type AlertSeverity = Alert["severity"];
export type AlertResolution = z.infer<typeof alertResolutionSchema>;
export type Deploy = z.infer<typeof deploySchema>;
export type DeployStage = Deploy["stage"];

export const getStageIndex = (stage: DeployStage) =>
  DEPLOY_STAGES.indexOf(stage);
