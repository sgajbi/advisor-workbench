import type { DpmPmOperatingQualityGatewayResponse } from "./types";

export type PmQualityActionError = {
  body: string;
  status: string;
  statusClass: string;
  source: string;
};

export type PmQualityFairnessCreateEvidence = {
  fairnessAnalysisId: string;
  correlationId: string;
  sourceService: string;
  upstreamStatus: string;
};

export type PmQualityReviewActionEvidence = {
  reviewActionId: string;
  correlationId: string;
  sourceService: string;
  upstreamStatus: string;
};

export type PmQualitySummaryInvocationEvidence = {
  summaryInvocationId: string;
  correlationId: string;
  sourceService: string;
  upstreamStatus: string;
};

export type PmQualityReviewActionForm = {
  actorId: string;
  targetType: string;
  targetId: string;
  actionType: string;
  actionState: string;
  reviewActionRef: string;
  boundedRationale: string;
};

export type PmQualitySummaryInvocationForm = {
  requestedBy: string;
  summaryRef: string;
  scoreRunId: string;
  reviewActionId: string;
  invocationState: string;
  workflowPackName: string;
  workflowPackVersion: string;
  workflowRunId: string;
  artifactRef: string;
  contentHash: string;
};

export function buildPmQualityActionError(
  error: unknown,
  fallback: string
): PmQualityActionError {
  const message = error instanceof Error ? error.message : fallback;
  const status = resolveGatewayStatus(message);
  return {
    body: message,
    status: status ?? "N/A",
    statusClass: status ? classifyGatewayStatus(status) : "unknown",
    source: "Gateway PM operating quality route",
  };
}

export function buildPmQualityBlockedActionError(message: string): PmQualityActionError {
  return {
    body: message,
    status: "N/A",
    statusClass: "blocked",
    source: "Manage action register via Gateway supportability",
  };
}

export function readPmQualityFairnessAnalysisId(
  response: DpmPmOperatingQualityGatewayResponse
): string | null {
  if (response.supportability.fairness_analysis_id) {
    return response.supportability.fairness_analysis_id;
  }
  const data = response.data;
  if (!isRecord(data)) {
    return null;
  }
  const fairnessAnalysis = data.fairness_analysis;
  if (!isRecord(fairnessAnalysis)) {
    return null;
  }
  const candidate = fairnessAnalysis.fairness_analysis_id;
  return typeof candidate === "string" && candidate ? candidate : null;
}

export function readPmQualityReviewActionId(
  response: DpmPmOperatingQualityGatewayResponse
): string | null {
  if (response.supportability.review_action_id) {
    return response.supportability.review_action_id;
  }
  const data = response.data;
  if (!isRecord(data)) {
    return null;
  }
  const reviewAction = data.review_action;
  if (!isRecord(reviewAction)) {
    return null;
  }
  const candidate = reviewAction.review_action_id;
  return typeof candidate === "string" && candidate ? candidate : null;
}

export function readPmQualitySummaryInvocationId(
  response: DpmPmOperatingQualityGatewayResponse
): string | null {
  if (response.supportability.summary_invocation_id) {
    return response.supportability.summary_invocation_id;
  }
  const data = response.data;
  if (!isRecord(data)) {
    return null;
  }
  const summaryInvocation = data.summary_invocation;
  if (!isRecord(summaryInvocation)) {
    return null;
  }
  const candidate = summaryInvocation.summary_invocation_id;
  return typeof candidate === "string" && candidate ? candidate : null;
}

export function buildPmQualityFairnessCreateEvidence(
  response: DpmPmOperatingQualityGatewayResponse
): PmQualityFairnessCreateEvidence {
  return {
    fairnessAnalysisId: readPmQualityFairnessAnalysisId(response) ?? "N/A",
    correlationId: response.correlation_id || "N/A",
    sourceService: response.supportability.source_service || response.source_service || "N/A",
    upstreamStatus: String(response.upstream_status ?? "N/A"),
  };
}

export function buildPmQualityReviewActionEvidence(
  response: DpmPmOperatingQualityGatewayResponse
): PmQualityReviewActionEvidence {
  return {
    reviewActionId: readPmQualityReviewActionId(response) ?? "N/A",
    correlationId: response.correlation_id || "N/A",
    sourceService: response.supportability.source_service || response.source_service || "N/A",
    upstreamStatus: String(response.upstream_status ?? "N/A"),
  };
}

export function buildPmQualitySummaryInvocationEvidence(
  response: DpmPmOperatingQualityGatewayResponse
): PmQualitySummaryInvocationEvidence {
  return {
    summaryInvocationId: readPmQualitySummaryInvocationId(response) ?? "N/A",
    correlationId: response.correlation_id || "N/A",
    sourceService: response.supportability.source_service || response.source_service || "N/A",
    upstreamStatus: String(response.upstream_status ?? "N/A"),
  };
}

function resolveGatewayStatus(message: string): string | null {
  return message.match(/\((\d{3})\)$/)?.[1] ?? null;
}

function classifyGatewayStatus(status: string): string {
  if (status === "401" || status === "403") {
    return "permission blocked";
  }
  if (status === "404" || status === "409" || status === "422") {
    return "business blocked";
  }
  if (status.startsWith("5")) {
    return "upstream unavailable";
  }
  return "request failed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
