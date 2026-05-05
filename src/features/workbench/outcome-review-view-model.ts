import type { DpmOutcomeReviewGatewayResponse } from "./types";

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
};

export type OutcomeReviewLineageRow = {
  key: string;
  source: string;
  reference: string;
  freshness: string;
  hash: string;
};

export type OutcomeReviewListItem = {
  outcomeReviewId: string;
  state: string;
  portfolioId: string;
  rebalanceRunId: string;
  waveId: string;
  proofPackId: string;
  expectedSnapshotHash: string;
  realizedSnapshotHash: string;
  retentionUntil: string;
  updatedAt: string;
  reportInputBlocked: boolean;
  aiEvidenceBlocked: boolean;
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
      remediationOwner: "Front Office Platform",
      sourceService: "lotus-gateway",
      authority: "lotus-manage:RFC-0042",
      correlationId: "N/A",
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
    items,
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
  return {
    outcomeReviewId,
    state: readString(record, "state") || "UNKNOWN",
    portfolioId: readString(record, "portfolio_id") || "N/A",
    rebalanceRunId: readString(record, "rebalance_run_id") || "N/A",
    waveId: readString(record, "wave_id") || "N/A",
    proofPackId: readString(record, "proof_pack_id") || "N/A",
    expectedSnapshotHash: readString(record, "expected_snapshot_hash") || "N/A",
    realizedSnapshotHash: readString(record, "realized_snapshot_hash") || "N/A",
    retentionUntil: readString(record, "retain_until") || readString(record, "retention_until") || "N/A",
    updatedAt: readString(record, "updated_at") || readString(record, "created_at") || "N/A",
    reportInputBlocked: blockedActions.includes("CREATE_REPORT_INPUT"),
    aiEvidenceBlocked: blockedActions.includes("REQUEST_AI_NARRATIVE"),
    dimensions: extractRecordArray(record.dimension_results).map((dimension, index) =>
      buildDimensionRow(dimension, index)
    ),
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

function extractOutcomeReviewRecords(data: Record<string, unknown>): Record<string, unknown>[] {
  const items = extractRecordArray(data.items);
  if (items.length > 0) {
    return items;
  }
  return typeof data.outcome_review_id === "string" ? [data] : [];
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
