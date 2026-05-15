import { preserveBusinessAcronyms } from "./business-label-formatters";
import type { DpmPmOperatingQualityGatewayResponse } from "./types";

export type PmOperatingQualityPanelState =
  | "ready"
  | "partial"
  | "blocked"
  | "empty"
  | "unavailable";

export type PmOperatingQualityPolicyRow = {
  key: string;
  policyId: string;
  policyVersion: string;
  enabled: string;
  state: string;
  asOfDate: string;
  reasonCodes: string;
};

export type PmOperatingQualityScoreRunRow = {
  key: string;
  scoreRunId: string;
  pmId: string;
  bookId: string;
  policy: string;
  state: string;
  score: string;
  asOfDate: string;
  forbiddenUses: string;
  sourceRefs: string;
  reasonCodes: string;
  contentHash: string;
};

export type PmOperatingQualityFairnessSegmentRequest = {
  segment_id: string;
  segment_type: string;
  display_name: string;
  score_run_ids: string[];
  source_refs?: Array<Record<string, unknown>>;
};

export type PmOperatingQualitySourceSegmentRow = {
  key: string;
  segment: string;
  segmentType: string;
  scoreRunCount: string;
  sourceRefs: string;
};

export type PmOperatingQualityFairnessSegmentRow = {
  key: string;
  segment: string;
  segmentType: string;
  state: string;
  scoreRunCount: string;
  averageScore: string;
  minimumScore: string;
  maximumScore: string;
  scoreRunRefs: string;
  sourceRefs: string;
  reasonCodes: string;
};

export type PmOperatingQualityFairnessDetail = {
  product: string;
  asOfDate: string;
  minimumSegmentScoreRunCount: string;
  maximumAverageScoreSpread: string;
  observedAverageScoreSpread: string;
  generatedAt: string;
  generatedBy: string;
  sourceRefs: string;
  forbiddenUses: string;
  reasonCodes: string;
};

export type PmOperatingQualityOperationEvidence = {
  operation: string;
  correlationId: string;
  contractVersion: string;
  sourceService: string;
  upstreamStatus: string;
};

export type PmOperatingQualityPanelModel = {
  state: PmOperatingQualityPanelState;
  supportabilityState: string;
  authority: string;
  policyId: string;
  policyVersion: string;
  scoreRunId: string;
  fairnessAnalysisId: string;
  count: string;
  reasonCodes: string[];
  blockedActions: string[];
  blockedActionPosture: string;
  policyRows: PmOperatingQualityPolicyRow[];
  scoreRunRows: PmOperatingQualityScoreRunRow[];
  fairnessSegmentRequests: PmOperatingQualityFairnessSegmentRequest[];
  sourceSegmentRows: PmOperatingQualitySourceSegmentRow[];
  fairnessSegmentRows: PmOperatingQualityFairnessSegmentRow[];
  selectedScoreRun: PmOperatingQualityScoreRunRow | null;
  fairnessAsOfDate: string;
  forbiddenUsePosture: string;
  fairnessState: string;
  fairnessSpread: string;
  fairnessDetail: PmOperatingQualityFairnessDetail;
  operationEvidence: PmOperatingQualityOperationEvidence;
  scoreRunPreviewReadinessState: string;
  scoreRunPreviewReadiness: string;
  fairnessPreviewReadinessState: string;
  fairnessPreviewReadiness: string;
};

export function buildPmOperatingQualityPanelModel(params: {
  policies: DpmPmOperatingQualityGatewayResponse | null;
  scoreRuns: DpmPmOperatingQualityGatewayResponse | null;
  preview?: DpmPmOperatingQualityGatewayResponse | null;
  fairnessPreview?: DpmPmOperatingQualityGatewayResponse | null;
}): PmOperatingQualityPanelModel {
  const primary = params.fairnessPreview ?? params.preview ?? params.scoreRuns ?? params.policies;
  const supportability = primary?.supportability;
  const supportabilityState = normalizeState(supportability?.state);
  const policyRows = buildPolicyRows(params.policies);
  const scoreRunRows = [
    ...buildScoreRunRows(params.preview),
    ...buildScoreRunRows(params.scoreRuns),
  ].filter(uniqueByScoreRunId);
  const fairnessAnalysis = readFairnessAnalysis(params.fairnessPreview);
  const fairnessSegmentRows = buildFairnessSegmentRows(fairnessAnalysis);
  const fairnessSegmentRequests = extractFairnessSegmentRequests(params.scoreRuns);
  const selectedScoreRun = scoreRunRows[0] ?? null;
  const reasonCodes = [
    ...(supportability?.reason_codes ?? []),
    ...scoreRunRows.flatMap((row) => splitList(row.reasonCodes)),
    ...fairnessSegmentRows.flatMap((row) => splitList(row.reasonCodes)),
  ].filter(uniqueString);
  const blockedActions = supportability?.blocked_actions ?? [];
  const policyId = firstNonEmpty(
    supportability?.policy_id,
    selectedScoreRun?.policy.split(" / ")[0],
    policyRows[0]?.policyId,
  );
  const policyVersion = firstNonEmpty(
    supportability?.policy_version,
    selectedScoreRun?.policy.split(" / ")[1],
    policyRows[0]?.policyVersion,
  );
  const fairnessPreviewReadiness = resolveFairnessPreviewReadiness({
    policyId,
    policyVersion,
    segmentCount: fairnessSegmentRequests.length,
    blockedActions,
  });
  const scoreRunPreviewReadiness = resolveScoreRunPreviewReadiness({
    policyId,
    policyVersion,
    blockedActions,
  });

  return {
    state: resolvePanelState(supportabilityState, policyRows.length, scoreRunRows.length, Boolean(primary)),
    supportabilityState,
    authority: supportability?.authority ?? "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    policyId,
    policyVersion,
    scoreRunId: firstNonEmpty(supportability?.score_run_id, selectedScoreRun?.scoreRunId),
    fairnessAnalysisId: firstNonEmpty(
      supportability?.fairness_analysis_id,
      readString(fairnessAnalysis, "fairness_analysis_id"),
    ),
    count: formatCount(supportability?.count, scoreRunRows.length),
    reasonCodes,
    blockedActions,
    blockedActionPosture: summarizeBlockedActions(blockedActions, supportability?.source_service),
    policyRows,
    scoreRunRows,
    fairnessSegmentRequests,
    sourceSegmentRows: buildSourceSegmentRows(fairnessSegmentRequests),
    fairnessSegmentRows,
    selectedScoreRun,
    fairnessAsOfDate: firstNonEmpty(selectedScoreRun?.asOfDate),
    forbiddenUsePosture: summarizeForbiddenUses(scoreRunRows),
    fairnessState: normalizeState(readString(fairnessAnalysis, "state")),
    fairnessSpread: readString(fairnessAnalysis, "observed_average_score_spread") || "N/A",
    fairnessDetail: buildFairnessDetail(fairnessAnalysis),
    operationEvidence: buildOperationEvidence({
      policies: params.policies,
      scoreRuns: params.scoreRuns,
      preview: params.preview,
      fairnessPreview: params.fairnessPreview,
    }),
    scoreRunPreviewReadinessState: scoreRunPreviewReadiness.state,
    scoreRunPreviewReadiness: scoreRunPreviewReadiness.detail,
    fairnessPreviewReadinessState: fairnessPreviewReadiness.state,
    fairnessPreviewReadiness: fairnessPreviewReadiness.detail,
  };
}

function buildOperationEvidence(params: {
  policies: DpmPmOperatingQualityGatewayResponse | null;
  scoreRuns: DpmPmOperatingQualityGatewayResponse | null;
  preview?: DpmPmOperatingQualityGatewayResponse | null;
  fairnessPreview?: DpmPmOperatingQualityGatewayResponse | null;
}): PmOperatingQualityOperationEvidence {
  const operation =
    params.fairnessPreview
      ? "Fairness analysis preview"
      : params.preview
        ? "Score-run preview"
        : params.scoreRuns
          ? "Score-run evidence load"
          : params.policies
            ? "Policy evidence load"
            : "No Gateway operation";
  const response = params.fairnessPreview ?? params.preview ?? params.scoreRuns ?? params.policies;
  return {
    operation,
    correlationId: response?.correlation_id ?? "N/A",
    contractVersion: response?.contract_version ?? "N/A",
    sourceService: response?.source_service ?? "N/A",
    upstreamStatus:
      typeof response?.upstream_status === "number" ? String(response.upstream_status) : "N/A",
  };
}

function buildPolicyRows(
  response: DpmPmOperatingQualityGatewayResponse | null
): PmOperatingQualityPolicyRow[] {
  if (!response) {
    return [];
  }
  const data = asRecord(response.data);
  const records = extractRecords(data.policies).length
    ? extractRecords(data.policies)
    : [data].filter(hasAnyPolicyIdentity);
  return records.map((record, index) => {
    const policyId = readString(record, "policy_id") || response.supportability.policy_id || "N/A";
    const policyVersion =
      readString(record, "policy_version") || response.supportability.policy_version || "N/A";
    return {
      key: `${policyId}-${policyVersion}-${index}`,
      policyId,
      policyVersion,
      enabled: formatBoolean(record.enabled),
      state:
        readString(record, "state") ||
        readString(record, "supportability_state") ||
        response.supportability.state ||
        "UNKNOWN",
      asOfDate: readString(record, "as_of_date") || "N/A",
      reasonCodes: formatList(record.reason_codes),
    };
  });
}

function buildScoreRunRows(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined
): PmOperatingQualityScoreRunRow[] {
  if (!response) {
    return [];
  }
  const data = asRecord(response.data);
  const records = extractRecords(data.score_runs).length
    ? extractRecords(data.score_runs)
    : [asRecord(data.score_run)].filter(hasAnyScoreRunIdentity);
  return records.map((record, index) => {
    const scoreRunId =
      readString(record, "score_run_id") ||
      response.supportability.score_run_id ||
      `score-run-${index + 1}`;
    const policyId = readString(record, "policy_id") || response.supportability.policy_id || "N/A";
    const policyVersion =
      readString(record, "policy_version") || response.supportability.policy_version || "N/A";
    return {
      key: `${scoreRunId}-${index}`,
      scoreRunId,
      pmId: readString(record, "pm_id") || "N/A",
      bookId: readString(record, "book_id") || "N/A",
      policy: `${policyId} / ${policyVersion}`,
      state:
        readString(record, "state") ||
        readString(record, "supportability_state") ||
        response.supportability.state ||
        "UNKNOWN",
      score: readString(record, "score") || readString(record, "overall_score") || "N/A",
      asOfDate: readString(record, "as_of_date") || readString(record, "created_at") || "N/A",
      forbiddenUses: formatForbiddenUses(record.forbidden_uses),
      sourceRefs: summarizeSourceRefs(extractRecords(record.source_refs)),
      reasonCodes: formatList(record.reason_codes),
      contentHash:
        readString(record, "content_hash") ||
        readString(record, "score_run_hash") ||
        readString(record, "payload_hash") ||
        "N/A",
    };
  });
}

function buildSourceSegmentRows(
  segments: PmOperatingQualityFairnessSegmentRequest[]
): PmOperatingQualitySourceSegmentRow[] {
  return segments.map((segment, index) => ({
    key: `${segment.segment_id}-${index}`,
    segment: segment.display_name || segment.segment_id,
    segmentType: formatSegmentType(segment.segment_type),
    scoreRunCount: String(segment.score_run_ids.length),
    sourceRefs: summarizeSourceRefs(segment.source_refs ?? []),
  }));
}

function extractFairnessSegmentRequests(
  response: DpmPmOperatingQualityGatewayResponse | null
): PmOperatingQualityFairnessSegmentRequest[] {
  if (!response) {
    return [];
  }
  const data = asRecord(response.data);
  const records = [
    ...extractRecords(data.fairness_segments),
    ...extractRecords(data.segments),
    ...extractRecords(asRecord(data.score_run).fairness_segments),
  ];
  return records.map((record) => {
    const sourceRefs = extractRecords(record.source_refs);
    return {
      segment_id: readString(record, "segment_id"),
      segment_type: readString(record, "segment_type"),
      display_name: readString(record, "display_name"),
      score_run_ids: extractStringArray(record.score_run_ids),
      ...(sourceRefs.length > 0 ? { source_refs: sourceRefs } : {}),
    };
  }).filter((segment) =>
    segment.segment_id &&
    segment.segment_type &&
    segment.display_name &&
    segment.score_run_ids.length > 0
  );
}

function readFairnessAnalysis(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined
): Record<string, unknown> {
  return asRecord(asRecord(response?.data).fairness_analysis);
}

function buildFairnessSegmentRows(
  fairnessAnalysis: Record<string, unknown>
): PmOperatingQualityFairnessSegmentRow[] {
  return extractRecords(fairnessAnalysis.segment_results).map((record, index) => {
    const segmentId = readString(record, "segment_id") || `segment-${index + 1}`;
    return {
      key: `${segmentId}-${index}`,
      segment: readString(record, "display_name") || segmentId,
      segmentType: formatSegmentType(readString(record, "segment_type")),
      state: readString(record, "state") || "UNKNOWN",
      scoreRunCount: readString(record, "score_run_count") || "0",
      averageScore: readString(record, "average_score") || "N/A",
      minimumScore: readString(record, "minimum_score") || "N/A",
      maximumScore: readString(record, "maximum_score") || "N/A",
      scoreRunRefs: summarizeSourceRefs(extractRecords(record.score_run_refs)),
      sourceRefs: summarizeSourceRefs(extractRecords(record.source_refs)),
      reasonCodes: formatList(record.reason_codes),
    };
  });
}

function buildFairnessDetail(
  fairnessAnalysis: Record<string, unknown>
): PmOperatingQualityFairnessDetail {
  return {
    product: [
      readString(fairnessAnalysis, "product_name"),
      readString(fairnessAnalysis, "product_version"),
    ]
      .filter(Boolean)
      .join(" / ") || "N/A",
    asOfDate: readString(fairnessAnalysis, "as_of_date") || "N/A",
    minimumSegmentScoreRunCount:
      readString(fairnessAnalysis, "minimum_segment_score_run_count") || "N/A",
    maximumAverageScoreSpread:
      readString(fairnessAnalysis, "maximum_average_score_spread") || "N/A",
    observedAverageScoreSpread:
      readString(fairnessAnalysis, "observed_average_score_spread") || "N/A",
    generatedAt: readString(fairnessAnalysis, "generated_at") || "N/A",
    generatedBy: readString(fairnessAnalysis, "generated_by") || "N/A",
    sourceRefs: summarizeSourceRefs(extractRecords(fairnessAnalysis.source_refs)),
    forbiddenUses: formatForbiddenUses(fairnessAnalysis.forbidden_uses),
    reasonCodes: formatList(fairnessAnalysis.reason_codes),
  };
}

function resolveScoreRunPreviewReadiness(params: {
  policyId: string;
  policyVersion: string;
  blockedActions: string[];
}): { state: string; detail: string } {
  if (params.blockedActions.includes("PREVIEW_SCORE_RUN")) {
    return {
      state: "BLOCKED",
      detail: "Blocked by Manage action register",
    };
  }
  if (params.policyId === "N/A" || params.policyVersion === "N/A") {
    return {
      state: "BLOCKED",
      detail: "Blocked until Manage returns policy id and version",
    };
  }
  return {
    state: "READY",
    detail: `Ready for policy ${params.policyId} / ${params.policyVersion}`,
  };
}

function resolveFairnessPreviewReadiness(params: {
  policyId: string;
  policyVersion: string;
  segmentCount: number;
  blockedActions: string[];
}): { state: string; detail: string } {
  if (params.blockedActions.includes("PREVIEW_FAIRNESS_ANALYSIS")) {
    return {
      state: "BLOCKED",
      detail: "Blocked by Manage action register",
    };
  }
  if (params.policyId === "N/A" || params.policyVersion === "N/A") {
    return {
      state: "BLOCKED",
      detail: "Blocked until Manage returns policy id and version",
    };
  }
  if (params.segmentCount < 2) {
    return {
      state: "BLOCKED",
      detail: `Blocked: ${params.segmentCount} source-defined ${formatSegmentCountNoun(
        params.segmentCount
      )} returned`,
    };
  }
  return {
    state: "READY",
    detail: `Ready: ${params.segmentCount} source-defined segments from Manage`,
  };
}

function formatSegmentCountNoun(count: number): string {
  return count === 1 ? "segment" : "segments";
}

function resolvePanelState(
  supportabilityState: string,
  policyCount: number,
  scoreRunCount: number,
  hasResponse: boolean,
): PmOperatingQualityPanelState {
  const normalized = supportabilityState.toUpperCase();
  if (!hasResponse) {
    return "unavailable";
  }
  if (normalized.includes("BLOCKED") || normalized.includes("UNSUPPORTED")) {
    return "blocked";
  }
  if (
    normalized.includes("PARTIAL") ||
    normalized.includes("DEGRADED") ||
    normalized.includes("WATCH") ||
    normalized.includes("PENDING") ||
    normalized.includes("REVIEW") ||
    normalized.includes("BREACH")
  ) {
    return "partial";
  }
  if (normalized.includes("EMPTY") || (policyCount === 0 && scoreRunCount === 0)) {
    return "empty";
  }
  return "ready";
}

function summarizeForbiddenUses(rows: PmOperatingQualityScoreRunRow[]): string {
  const forbiddenUses = rows.flatMap((row) => splitList(row.forbiddenUses)).filter(uniqueString);
  return forbiddenUses.length > 0
    ? forbiddenUses.map(formatForbiddenUse).join(", ")
    : "No forbidden-use list returned";
}

function summarizeBlockedActions(actions: string[], sourceService: string | null | undefined): string {
  if (actions.length === 0) {
    return "None";
  }
  const source = sourceService || "Manage action register";
  return actions.map((action) => `${formatActionLabel(action)} (${action}; ${source})`).join(", ");
}

function uniqueByScoreRunId(row: PmOperatingQualityScoreRunRow, index: number, rows: PmOperatingQualityScoreRunRow[]) {
  return rows.findIndex((candidate) => candidate.scoreRunId === row.scoreRunId) === index;
}

function uniqueString(value: string, index: number, values: string[]) {
  return value.length > 0 && values.indexOf(value) === index;
}

function hasAnyPolicyIdentity(record: Record<string, unknown>) {
  return Boolean(readString(record, "policy_id") || readString(record, "policy_version"));
}

function hasAnyScoreRunIdentity(record: Record<string, unknown>) {
  return Boolean(readString(record, "score_run_id"));
}

function formatCount(count: number | null | undefined, fallback: number) {
  if (typeof count === "number" && Number.isFinite(count)) {
    return String(count);
  }
  return String(fallback);
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  return values.find((value) => value && value.trim().length > 0 && value !== "N/A") ?? "N/A";
}

function normalizeState(value: string | null | undefined): string {
  return value?.trim().toUpperCase() || "UNKNOWN";
}

function formatBoolean(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Enabled" : "Disabled";
  }
  return "N/A";
}

function formatList(value: unknown): string {
  const items = extractStringArray(value);
  return items.length > 0 ? items.join(", ") : "N/A";
}

function formatForbiddenUses(value: unknown): string {
  const items = extractStringArray(value);
  return items.length > 0 ? items.map(formatForbiddenUse).join(", ") : "N/A";
}

function formatForbiddenUse(value: string): string {
  return `${formatActionLabel(value)} (${value})`;
}

function formatActionLabel(value: string): string {
  return preserveBusinessAcronyms(
    value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (match) => match.toUpperCase())
  );
}

function formatSegmentType(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return "N/A";
  }
  const labels: Record<string, string> = {
    MANDATE_TYPE: "Mandate type",
    REGION: "Region",
    BOOK_PROFILE: "Book profile",
    CLIENT_CONSTRAINT_PROFILE: "Client constraint profile",
    MARKET_REGIME: "Market regime",
    CUSTOM_SOURCE_SEGMENT: "Custom source segment",
  };
  return labels[normalized] ?? normalized.replaceAll("_", " ").toLowerCase();
}

function summarizeSourceRefs(refs: Array<Record<string, unknown>>): string {
  if (refs.length === 0) {
    return "N/A";
  }
  return refs
    .map(formatSourceRef)
    .filter((value) => value !== "N/A")
    .join(", ") || "N/A";
}

function formatSourceRef(ref: Record<string, unknown>): string {
  const explicitRef = readString(ref, "source_ref");
  if (explicitRef) {
    return `Ref: ${explicitRef}`;
  }
  const system = readString(ref, "source_system");
  const product = readString(ref, "source_product") || readString(ref, "source_type");
  const id = readString(ref, "source_id");
  const parts = [
    system ? `System: ${system}` : "",
    product ? `Product: ${product}` : "",
    id ? `Id: ${id}` : "",
  ].filter(Boolean);
  return parts.join(" | ") || firstNonEmpty(readString(ref, "source_type"));
}

function splitList(value: string): string[] {
  return value === "N/A" ? [] : value.split(",").map((item) => item.trim()).filter(Boolean);
}

function extractRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
}

function extractStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}
