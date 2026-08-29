import type { DpmOutcomeReviewGatewayResponse } from "./types";
import {
  formatBusinessDateValue,
  formatCalendarDateValue,
  formatTimestampValue,
  isTimestampValue,
} from "@/design-system/utils/financial-formatters";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";

export type OutcomeReviewPanelState =
  | "ready"
  | "empty"
  | "partial"
  | "blocked"
  | "unsupported"
  | "unavailable";

export type OutcomeReviewDimensionRow = {
  key: string;
  dimension: string;
  expected: string;
  realized: string;
  variance: string;
  state: string;
  explanation: string;
};

export type OutcomeReviewLineageRow = {
  key: string;
  source: string;
  sourceType?: string;
  reference: string;
  freshness: string;
  hash: string;
};

export type OutcomeReviewSourceFacetRow = {
  key: string;
  label: string;
  count: string;
  family: "owner" | "type";
};

export type OutcomeReviewSourceBoundary = {
  appliedFilters: string[];
  supportBoundary: string[];
  sourceOwnerFacets: OutcomeReviewSourceFacetRow[];
  sourceTypeFacets: OutcomeReviewSourceFacetRow[];
};

export type OutcomeReviewClientCommunicationBoundaryView = {
  boundaryId: string;
  state: string;
  reasonCode: string;
  summary: string;
  clientCommunicationProjected: boolean;
  clientApprovalProjected: boolean;
  blockedCapabilities: string[];
  requiredOwner: string;
  requiredSourceProduct: string;
  sourceProduct: string;
  contentHash: string;
};

export type OutcomeReviewListItem = {
  outcomeReviewId: string;
  reviewLabel: string;
  state: string;
  overallOutcome: string;
  reviewWindow: string;
  outcomeStatusLabel: string;
  reviewPostureLabel: string;
  driftImprovementLabel: string;
  mandateImpact: string;
  clientRationale: string;
  portfolioId: string;
  rebalanceRunId: string;
  waveId: string;
  proofPackId: string;
  expectedSnapshotHash: string;
  realizedSnapshotHash: string;
  retentionUntil: string;
  sourceUpdatedAt: string | null;
  updatedAt: string;
  reportInputBlocked: boolean;
  aiEvidenceBlocked: boolean;
  clientCommunicationBoundary: OutcomeReviewClientCommunicationBoundaryView | null;
  dimensions: OutcomeReviewDimensionRow[];
  lineage: OutcomeReviewLineageRow[];
};

export type OutcomeReviewPanelModel = {
  state: OutcomeReviewPanelState;
  supportabilityState: string;
  supportabilityReasons: string[];
  blockedActions: string[];
  remediationOwner: string;
  sourceService: string;
  authority: string;
  correlationId: string;
  sourceBoundary?: OutcomeReviewSourceBoundary;
  items: OutcomeReviewListItem[];
};

export function buildOutcomeReviewPanelModel(
  response: DpmOutcomeReviewGatewayResponse | null
): OutcomeReviewPanelModel {
  if (!response) {
    return {
      state: "unavailable",
      supportabilityState: "UNAVAILABLE",
      supportabilityReasons: ["GATEWAY_OUTCOME_REVIEW_UNAVAILABLE"],
      blockedActions: ["CREATE_REPORT_INPUT", "REQUEST_AI_NARRATIVE"],
      remediationOwner: "Front-office operations",
      sourceService: "lotus-gateway",
      authority: "lotus-manage:RFC-0042",
      correlationId: "N/A",
      sourceBoundary: emptySourceBoundary(),
      items: [],
    };
  }

  const records = extractOutcomeReviewRecords(response.data);
  const supportabilityState = resolveSupportabilityState(
    normalizeState(response.supportability.state),
    records
  );
  const items = records.map((record, index) =>
    buildOutcomeReviewListItem(record, response.supportability.blocked_actions, index)
  );
  return {
    state: resolvePanelState(supportabilityState, items.length),
    supportabilityState,
    supportabilityReasons: response.supportability.reason_codes,
    blockedActions: response.supportability.blocked_actions,
    remediationOwner: response.supportability.remediation_owner ?? "N/A",
    sourceService: response.supportability.source_service || response.source_service,
    authority: response.supportability.authority,
    correlationId: response.correlation_id,
    sourceBoundary: buildSourceBoundary(response),
    items,
  };
}

export function buildOutcomeClientCommunicationBoundaryView(
  payload: unknown
): OutcomeReviewClientCommunicationBoundaryView | null {
  const boundary = isRecord(payload) ? readRecord(payload, "client_communication_boundary") : {};
  const boundaryId = readString(boundary, "boundary_id");
  if (!boundaryId) {
    return null;
  }
  const sourceProductName = readString(boundary, "source_product_name") || "N/A";
  const sourceProductVersion = readString(boundary, "source_product_version") || "N/A";
  return {
    boundaryId,
    state: readString(boundary, "supportability_state") || "UNKNOWN",
    reasonCode: readString(boundary, "reason_code") || "N/A",
    summary: readString(boundary, "summary") || "No boundary summary returned.",
    clientCommunicationProjected: readBoolean(boundary, "client_communication_projected"),
    clientApprovalProjected: readBoolean(boundary, "client_approval_projected"),
    blockedCapabilities: readStringArray(boundary, "blocked_capabilities"),
    requiredOwner: readString(boundary, "required_owner") || "N/A",
    requiredSourceProduct: readString(boundary, "required_source_product") || "N/A",
    sourceProduct: `${sourceProductName}:${sourceProductVersion}`,
    contentHash: readString(boundary, "content_hash") || "N/A",
  };
}

function resolvePanelState(
  supportabilityState: string,
  itemCount: number
): OutcomeReviewPanelState {
  if (supportabilityState === "BLOCKED") {
    return "blocked";
  }
  if (supportabilityState === "UNSUPPORTED") {
    return "unsupported";
  }
  if (supportabilityState === "DEGRADED" || supportabilityState === "UNKNOWN") {
    return itemCount > 0 ? "partial" : "unavailable";
  }
  return itemCount > 0 ? "ready" : "empty";
}

function resolveSupportabilityState(
  gatewayState: string,
  records: Record<string, unknown>[]
): string {
  if (gatewayState !== "UNKNOWN" || records.length === 0) {
    return gatewayState;
  }
  const recordStates = records.map((record) => normalizeState(readString(record, "state")));
  if (recordStates.every((state) => state === "READY")) {
    return "READY";
  }
  if (recordStates.some((state) => state === "BLOCKED" || state === "UNSUPPORTED")) {
    return recordStates.find((state) => state === "BLOCKED" || state === "UNSUPPORTED") ?? "UNKNOWN";
  }
  if (recordStates.some((state) => state === "DEGRADED" || state === "SOURCE_STALE")) {
    return "DEGRADED";
  }
  return gatewayState;
}

function buildOutcomeReviewListItem(
  record: Record<string, unknown>,
  blockedActions: string[],
  fallbackIndex: number
): OutcomeReviewListItem {
  const outcomeReviewId = readString(record, "outcome_review_id") || `outcome-review-${fallbackIndex + 1}`;
  const state = readString(record, "state") || "UNKNOWN";
  const overallOutcome = readString(record, "overall_outcome") || state;
  const reviewWindow = formatReviewWindow(readRecord(record, "review_window"));
  const dimensions = extractRecordArray(record.dimension_results).map((dimension, index) =>
    buildDimensionRow(dimension, index)
  );
  const varianceSummary = readRecord(record, "variance_summary");
  const sourceUpdatedAt = readString(record, "updated_at") || readString(record, "created_at");
  return {
    outcomeReviewId,
    reviewLabel: buildReviewLabel(record, fallbackIndex),
    state,
    overallOutcome,
    reviewWindow,
    outcomeStatusLabel: outcomeStatusLabel(overallOutcome, state),
    reviewPostureLabel: reviewPostureLabel(state, blockedActions),
    driftImprovementLabel: driftImprovementLabel(varianceSummary, dimensions),
    mandateImpact: mandateImpactCopy(overallOutcome, dimensions),
    clientRationale: clientRationaleCopy(record, overallOutcome, dimensions),
    portfolioId: readString(record, "portfolio_id") || "N/A",
    rebalanceRunId: readString(record, "rebalance_run_id") || "N/A",
    waveId: readString(record, "wave_id") || "N/A",
    proofPackId: readString(record, "proof_pack_id") || "N/A",
    expectedSnapshotHash: readOutcomeSnapshotHash(
      record,
      "expected_snapshot",
      "expected",
    ),
    realizedSnapshotHash: readOutcomeSnapshotHash(
      record,
      "realized_snapshot",
      "realized",
    ),
    retentionUntil: formatBusinessDateValue(
      readString(record, "retain_until") || readString(record, "retention_until"),
      { nullDisplay: "Not reported" },
    ),
    sourceUpdatedAt: isTimestampValue(sourceUpdatedAt) ? sourceUpdatedAt.trim() : null,
    updatedAt: formatTimestampValue(sourceUpdatedAt, { nullDisplay: "Not reported" }),
    reportInputBlocked: blockedActions.includes("CREATE_REPORT_INPUT"),
    aiEvidenceBlocked: blockedActions.includes("REQUEST_AI_NARRATIVE"),
    clientCommunicationBoundary: buildOutcomeClientCommunicationBoundaryView(record),
    dimensions,
    lineage: [
      ...extractRecordArray(record.source_lineage),
      ...extractRecordArray(record.lineage),
      ...extractRecordArray(record.evidence_lineage),
    ].map((lineage, index) => buildLineageRow(lineage, index)),
  };
}

function buildDimensionRow(
  record: Record<string, unknown>,
  index: number
): OutcomeReviewDimensionRow {
  const dimension = readString(record, "dimension") || readString(record, "metric") || `dimension_${index + 1}`;
  return {
    key: `${dimension}-${index}`,
    dimension,
    expected: formatOutcomeValue(record.expected),
    realized: formatOutcomeValue(record.realized),
    variance: formatOutcomeValue(record.variance),
    state: readString(record, "state") || readString(record, "status") || "UNKNOWN",
    explanation: readString(record, "explanation") || "No dimension explanation returned.",
  };
}

function buildLineageRow(record: Record<string, unknown>, index: number): OutcomeReviewLineageRow {
  const source =
    readString(record, "source_service") ||
    readString(record, "source_system") ||
    readString(record, "source") ||
    "N/A";
  const reference =
    readString(record, "source_ref") ||
    readString(record, "source_id") ||
    readString(record, "reference") ||
    readString(record, "id") ||
    "N/A";
  return {
    key: `${source}-${reference}-${index}`,
    source,
    sourceType: readString(record, "source_type") || readString(record, "product_name") || "N/A",
    reference,
    freshness:
      readString(record, "freshness") ||
      readString(record, "freshness_bucket") ||
      readString(record, "freshness_state") ||
      "N/A",
    hash:
      readString(record, "hash") ||
      readString(record, "payload_hash") ||
      readString(record, "content_hash") ||
      "N/A",
  };
}

function buildSourceBoundary(
  response: DpmOutcomeReviewGatewayResponse,
): OutcomeReviewSourceBoundary {
  return {
    appliedFilters: formatObjectEntries(response.supportability.applied_filters),
    supportBoundary: formatObjectEntries(response.supportability.support_boundary),
    sourceOwnerFacets: buildFacetRows(response.supportability.source_owner_counts, "owner"),
    sourceTypeFacets: buildFacetRows(response.supportability.source_type_counts, "type"),
  };
}

function emptySourceBoundary(): OutcomeReviewSourceBoundary {
  return {
    appliedFilters: [],
    supportBoundary: [],
    sourceOwnerFacets: [],
    sourceTypeFacets: [],
  };
}

function buildFacetRows(
  counts: Record<string, number> | undefined,
  family: "owner" | "type",
): OutcomeReviewSourceFacetRow[] {
  return Object.entries(counts ?? {})
    .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
    .slice(0, 6)
    .map(([label, count]) => ({
      key: `${family}-${label}`,
      label:
        family === "owner"
          ? outcomeReviewSourceOwnerLabel(label)
          : outcomeReviewSourceTypeLabel(label),
      count: count.toLocaleString(),
      family,
    }));
}

function formatObjectEntries(value: Record<string, unknown> | undefined): string[] {
  return Object.entries(value ?? {})
    .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== "")
    .map(([key, entryValue]) => `${labelFromKey(key)}: ${formatFilterValue(entryValue)}`);
}

function formatFilterValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatFilterValue(item)).join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  const text = String(value);
  if (/^lotus[-_]/i.test(text)) {
    return outcomeReviewSourceOwnerLabel(text);
  }
  if (/^[A-Za-z][A-Za-z0-9]*:v\d+$/i.test(text)) {
    return outcomeReviewSourceTypeLabel(text);
  }
  const knownValues: Record<string, string> = {
    selected_portfolio: "Selected portfolio",
    source_ranked: "Source-ranked",
  };
  return knownValues[text.toLowerCase()] ?? text;
}

function labelFromKey(value: string): string {
  const words = value
    .split("_")
    .filter(Boolean)
    .map((word) => word.toLowerCase())
    .join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : value;
}

function outcomeReviewSourceOwnerLabel(value: string): string {
  const knownOwners: Record<string, string> = {
    "lotus-ai": "AI workflow",
    "lotus-manage": "Portfolio management",
    "lotus-performance": "Performance analytics",
    "lotus-report": "Reporting",
  };
  const normalized = value.trim().toLowerCase();
  if (knownOwners[normalized]) {
    return knownOwners[normalized];
  }
  return labelFromKey(normalized.replace(/^lotus[-_]/, "").replaceAll("-", "_"));
}

function outcomeReviewSourceTypeLabel(value: string): string {
  const withoutVersion = value.trim().replace(/:v\d+$/i, "");
  const spaced = withoutVersion
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\brealized\b/gi, "realised")
    .toLowerCase();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : value;
}

function extractOutcomeReviewRecords(data: Record<string, unknown>): Record<string, unknown>[] {
  const items = extractRecordArray(data.items);
  if (items.length > 0) {
    return items;
  }
  return typeof data.outcome_review_id === "string" ? [data] : [];
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function extractRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function readOutcomeSnapshotHash(
  record: Record<string, unknown>,
  snapshotKey: "expected_snapshot" | "realized_snapshot",
  hashKey: "expected" | "realized",
): string {
  const snapshot = readRecord(record, snapshotKey);
  const sourceHashes = readRecord(snapshot, "source_hashes");
  const hash = readString(sourceHashes, hashKey).trim();
  return /^sha256:.+$/u.test(hash) ? hash : "N/A";
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function formatOutcomeValue(value: unknown): string {
  if (isRecord(value)) {
    const nestedValue = value.value;
    const unit = typeof value.unit === "string" ? value.unit : "";
    const formatted = formatOutcomeValue(nestedValue);
    return unit && formatted !== "N/A" ? `${formatted} ${unit}` : formatted;
  }
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "N/A";
  }
  return JSON.stringify(value);
}

function normalizeState(state: string): string {
  return state.trim().toUpperCase() || "UNKNOWN";
}

function buildReviewLabel(record: Record<string, unknown>, fallbackIndex: number): string {
  const createdAt = readString(record, "created_at") || readString(record, "updated_at");
  const window = readRecord(record, "review_window");
  const windowEnd = readString(window, "end") || readString(window, "end_date");
  const dateLabel = formatDateLabel(windowEnd || createdAt);
  return dateLabel ? `${dateLabel} review` : `Review ${fallbackIndex + 1}`;
}

function formatReviewWindow(window: Record<string, unknown>): string {
  const start = formatDateLabel(readString(window, "start") || readString(window, "start_date"));
  const end = formatDateLabel(readString(window, "end") || readString(window, "end_date"));
  if (start && end) {
    return `${start} - ${end}`;
  }
  return end || start || "N/A";
}

function formatDateLabel(value: string): string {
  return formatCalendarDateValue(value, { nullDisplay: "" });
}

function outcomeStatusLabel(overallOutcome: string, state: string): string {
  const sourceOutcome = overallOutcome.trim();
  if (sourceOutcome && !isMachineStateValue(sourceOutcome)) {
    return sourceOutcome;
  }
  const normalized = normalizeState(sourceOutcome || state);
  if (normalized.includes("WITHIN_TOLERANCE") || normalized === "READY") {
    return normalized === "READY"
      ? MANAGE_OUTCOME_REVIEW_LABELS.outcomeEvidenceReady
      : MANAGE_OUTCOME_REVIEW_LABELS.withinExpectedTolerance;
  }
  if (normalized.includes("PENDING")) {
    return MANAGE_OUTCOME_REVIEW_LABELS.reviewPending;
  }
  if (normalized.includes("BREACH")) {
    return MANAGE_OUTCOME_REVIEW_LABELS.outsideExpectedTolerance;
  }
  if (normalized.includes("BLOCK")) {
    return MANAGE_OUTCOME_REVIEW_LABELS.blocked;
  }
  return MANAGE_OUTCOME_REVIEW_LABELS.reviewRequired;
}

function reviewPostureLabel(state: string, blockedActions: string[]): string {
  const normalized = normalizeState(state);
  if (blockedActions.length > 0 || normalized === "BLOCKED") {
    return MANAGE_OUTCOME_REVIEW_LABELS.needsAttention;
  }
  if (normalized === "READY") {
    return MANAGE_OUTCOME_REVIEW_LABELS.readyForAdviserReview;
  }
  if (normalized === "PENDING_REVIEW") {
    return MANAGE_OUTCOME_REVIEW_LABELS.adviserReviewPending;
  }
  if (normalized === "BREACHED") {
    return MANAGE_OUTCOME_REVIEW_LABELS.escalationRequired;
  }
  return MANAGE_OUTCOME_REVIEW_LABELS.reviewRequired;
}

function isMachineStateValue(value: string): boolean {
  return /^[A-Z][A-Z0-9_:-]*$/.test(value);
}

function driftImprovementLabel(
  varianceSummary: Record<string, unknown>,
  dimensions: OutcomeReviewDimensionRow[]
): string {
  const directValue =
    readNumber(varianceSummary, "drift_improvement_pct") ??
    readNumber(varianceSummary, "drift_improvement") ??
    readNumber(varianceSummary, "DRIFT_REDUCTION");
  if (directValue !== null) {
    return formatPercent(directValue);
  }
  const driftDimension = dimensions.find((dimension) =>
    normalizeState(dimension.dimension).includes("DRIFT")
  );
  if (!driftDimension) {
    return "N/A";
  }
  return driftDimension.realized !== "N/A" ? driftDimension.realized : driftDimension.variance;
}

function mandateImpactCopy(
  overallOutcome: string,
  dimensions: OutcomeReviewDimensionRow[]
): string {
  const topDimension = dimensions[0];
  const topExplanation =
    topDimension?.explanation && topDimension.explanation !== "No dimension explanation returned."
      ? topDimension.explanation
      : "";
  const status = outcomeStatusLabel(overallOutcome, overallOutcome);
  if (topExplanation) {
    return `${topExplanation} Overall outcome: ${withTerminalFullStop(status)}`;
  }
  return `Outcome review: ${withTerminalFullStop(status)} Evidence is based on the returned expected-versus-realised dimensions.`;
}

function clientRationaleCopy(
  record: Record<string, unknown>,
  overallOutcome: string,
  dimensions: OutcomeReviewDimensionRow[]
): string {
  const supportability = readRecord(record, "supportability");
  const explanation = readString(supportability, "explanation");
  if (explanation) {
    return explanation;
  }
  const pendingDimension = dimensions.find((dimension) => normalizeState(dimension.state).includes("REVIEW"));
  if (pendingDimension) {
    return `${pendingDimension.dimension} needs adviser review before the outcome can be closed.`;
  }
  return `Review outcome: ${withTerminalFullStop(outcomeStatusLabel(overallOutcome, overallOutcome))} Evidence is limited to the expected-versus-realised results available for this period.`;
}

function withTerminalFullStop(value: string): string {
  const trimmed = value.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatPercent(value: number): string {
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return `${percent.toLocaleString(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: percent % 1 === 0 ? 0 : 1,
  })}%`;
}
