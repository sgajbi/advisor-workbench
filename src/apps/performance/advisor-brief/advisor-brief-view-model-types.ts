import type { PerformanceWorkspaceMode } from "../performance-workspace-modes";

export type PerformanceAdvisorBriefStatus =
  | "ready"
  | "loading"
  | "partial"
  | "empty"
  | "unavailable";

export type PerformanceAdvisorBriefTone = "neutral" | "positive" | "warning";

export type PerformanceAdvisorBriefEvidenceRef = {
  metricLabel: string;
  metricValue: string;
  sourceSurface: string;
  route: string;
  targetMode: PerformanceWorkspaceMode;
};

export type PerformanceAdvisorBriefItem = {
  headline: string;
  detail: string;
  tone: PerformanceAdvisorBriefTone;
  evidenceRefs: PerformanceAdvisorBriefEvidenceRef[];
};

export type PerformanceAdvisorBriefAction = {
  label: string;
  route: string;
  targetMode: PerformanceWorkspaceMode;
};

export type PerformanceAdvisorBriefMetric = {
  label: string;
  value: string;
  supportingText: string;
  targetMode: PerformanceWorkspaceMode;
  route: string;
};

export type PerformanceAdvisorBriefSupportabilityItem = {
  label: string;
  value: string;
  tone: "success" | "warn" | "danger";
};

export type PerformanceAdvisorBriefAudit = {
  taskId: string;
  outputLabel: string;
  promptVersion: string;
  providerMode: string;
  providerId: string | null;
  adapterKind: string | null;
  modelId: string | null;
  generatedAt: string;
  stubbed: boolean;
  sourceRefs: string[];
};

export type PerformanceAdvisorBriefViewModel = {
  status: PerformanceAdvisorBriefStatus;
  title: string;
  summary: string;
  talkingPoints: PerformanceAdvisorBriefItem[];
  recommendedActions: PerformanceAdvisorBriefAction[];
  risksAndExceptions: PerformanceAdvisorBriefItem[];
  sourceMetrics: PerformanceAdvisorBriefMetric[];
  supportability: PerformanceAdvisorBriefSupportabilityItem[];
  reviewNotes: string[];
  audit: PerformanceAdvisorBriefAudit;
};
