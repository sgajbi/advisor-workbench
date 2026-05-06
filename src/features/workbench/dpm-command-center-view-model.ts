import type { DpmCommandCenterGatewayResponse } from "./types";

export type DpmCommandCenterPanelState =
  | "complete"
  | "partial"
  | "empty"
  | "unsupported"
  | "unavailable";

export type DpmCommandCenterMetric = {
  key: string;
  label: string;
  value: string;
};

export type DpmCommandCenterAttentionRow = {
  key: string;
  dimension: string;
  severity: string;
  reasonCode: string;
  recommendedAction: string;
  count: string;
};

export type DpmCommandCenterActionRow = {
  key: string;
  action: string;
  severity: string;
  count: string;
};

export type DpmCommandCenterHealthDimensionRow = {
  key: string;
  dimension: string;
  score: string;
  state: string;
  reasons: string;
};

export type DpmCommandCenterExceptionRow = {
  key: string;
  exceptionId: string;
  mandateId: string;
  severity: string;
  reasonCode: string;
  recommendedAction: string;
  state: string;
};

export type DpmCommandCenterPanelModel = {
  state: DpmCommandCenterPanelState;
  supportabilityState: string;
  dataCompletenessState: string;
  partialReadinessReasons: string[];
  sourceService: string;
  authority: string;
  correlationId: string;
  sourceRunId: string;
  remediationOwner: string;
  evaluatedMandates: string;
  activeExceptionCount: string;
  latestMonitoringRunId: string;
  latestMonitoringRunStatus: string;
  healthDistribution: DpmCommandCenterMetric[];
  sourceReadiness: DpmCommandCenterMetric[];
  attentionRows: DpmCommandCenterAttentionRow[];
  recommendedActions: DpmCommandCenterActionRow[];
  exceptionRows: DpmCommandCenterExceptionRow[];
  mandateId: string;
  mandateHealthScore: string;
  mandateHealthState: string;
  mandateRecommendedAction: string;
  mandateHealthDimensions: DpmCommandCenterHealthDimensionRow[];
};

export function buildDpmCommandCenterPanelModel(params: {
  commandCenter: DpmCommandCenterGatewayResponse | null;
  exceptions?: DpmCommandCenterGatewayResponse | null;
  mandate?: DpmCommandCenterGatewayResponse | null;
  mandateHealth?: DpmCommandCenterGatewayResponse | null;
}): DpmCommandCenterPanelModel {
  const commandCenter = params.commandCenter;
  if (!commandCenter) {
    return {
      state: "unavailable",
      supportabilityState: "UNAVAILABLE",
      dataCompletenessState: "UNKNOWN",
      partialReadinessReasons: ["GATEWAY_COMMAND_CENTER_UNAVAILABLE"],
      sourceService: "lotus-gateway",
      authority: "lotus-manage:RFC-0038",
      correlationId: "N/A",
      sourceRunId: "N/A",
      remediationOwner: "Front Office Platform",
      evaluatedMandates: "N/A",
      activeExceptionCount: "N/A",
      latestMonitoringRunId: "N/A",
      latestMonitoringRunStatus: "N/A",
      healthDistribution: [],
      sourceReadiness: [],
      attentionRows: [],
      recommendedActions: [],
      exceptionRows: [],
      mandateId: "N/A",
      mandateHealthScore: "N/A",
      mandateHealthState: "N/A",
      mandateRecommendedAction: "N/A",
      mandateHealthDimensions: [],
    };
  }

  const supportability = commandCenter.supportability;
  const supportabilityState = normalizeState(supportability.state);
  const commandData = commandCenter.data;
  const mandateData = params.mandate?.data ?? {};
  const mandateHealthData = params.mandateHealth?.data ?? {};
  const mandateId =
    readString(mandateHealthData, "mandate_id") ||
    readString(mandateData, "mandate_id") ||
    readString(commandData, "mandate_id") ||
    "N/A";
  const latestMonitoringRun = readRecord(
    commandData.latest_monitoring_run || commandData.monitoring_run,
  );

  return {
    state: resolvePanelState(supportabilityState),
    supportabilityState,
    dataCompletenessState:
      supportability.data_completeness_state ||
      readString(commandData, "data_completeness_state") ||
      "UNKNOWN",
    partialReadinessReasons: supportability.partial_readiness_reasons,
    sourceService:
      supportability.source_service || commandCenter.source_service,
    authority: supportability.authority,
    correlationId: commandCenter.correlation_id,
    sourceRunId:
      supportability.source_run_id ||
      readString(commandData, "source_run_id") ||
      readString(latestMonitoringRun, "monitoring_run_id") ||
      "N/A",
    remediationOwner: supportability.remediation_owner ?? "N/A",
    evaluatedMandates: formatValue(
      readValue(commandData, "evaluated_mandates"),
    ),
    activeExceptionCount: formatValue(
      readValue(commandData, "active_exception_count"),
    ),
    latestMonitoringRunId:
      readString(latestMonitoringRun, "monitoring_run_id") ||
      readString(latestMonitoringRun, "run_id") ||
      "N/A",
    latestMonitoringRunStatus:
      readString(latestMonitoringRun, "status") ||
      readString(commandData, "latest_monitoring_run_status") ||
      "N/A",
    healthDistribution: buildMetricRows(commandData.health_distribution),
    sourceReadiness: buildMetricRows(commandData.source_readiness_summary),
    attentionRows: buildAttentionRows(commandData.attention_buckets),
    recommendedActions: buildRecommendedActionRows(
      commandData.recommended_actions,
    ),
    exceptionRows: buildExceptionRows(params.exceptions?.data),
    mandateId,
    mandateHealthScore: formatValue(
      readValue(mandateHealthData, "health_score"),
    ),
    mandateHealthState:
      readString(mandateHealthData, "health_state") ||
      readString(mandateData, "health_state") ||
      "N/A",
    mandateRecommendedAction:
      readString(mandateHealthData, "recommended_action") ||
      readString(mandateData, "recommended_action") ||
      "N/A",
    mandateHealthDimensions: extractRecordArray(
      mandateHealthData.dimension_scores,
    ).map(buildHealthDimensionRow),
  };
}

function resolvePanelState(
  supportabilityState: string,
): DpmCommandCenterPanelState {
  if (supportabilityState === "EMPTY") {
    return "empty";
  }
  if (supportabilityState === "PARTIAL" || supportabilityState === "UNKNOWN") {
    return "partial";
  }
  if (
    supportabilityState === "UNSUPPORTED" ||
    supportabilityState === "BLOCKED"
  ) {
    return "unsupported";
  }
  return "complete";
}

function buildMetricRows(value: unknown): DpmCommandCenterMetric[] {
  const record = readRecord(value);
  return Object.entries(record).map(([key, item]) => ({
    key,
    label: formatLabel(key),
    value: formatValue(item),
  }));
}

function buildAttentionRows(value: unknown): DpmCommandCenterAttentionRow[] {
  const records = extractRecordsFromArrayOrRecord(value);
  return records.map((record, index) => ({
    key:
      readString(record, "key") ||
      readString(record, "reason_code") ||
      `attention-${index + 1}`,
    dimension:
      readString(record, "dimension") ||
      readString(record, "health_dimension") ||
      "N/A",
    severity: readString(record, "severity") || "N/A",
    reasonCode: readString(record, "reason_code") || "N/A",
    recommendedAction: readString(record, "recommended_action") || "N/A",
    count: formatValue(readValue(record, "count")),
  }));
}

function buildRecommendedActionRows(
  value: unknown,
): DpmCommandCenterActionRow[] {
  const records = extractRecordsFromArrayOrRecord(value);
  return records.map((record, index) => ({
    key:
      readString(record, "recommended_action") ||
      readString(record, "action") ||
      `action-${index + 1}`,
    action:
      readString(record, "recommended_action") ||
      readString(record, "action") ||
      "N/A",
    severity: readString(record, "severity") || "N/A",
    count: formatValue(readValue(record, "count")),
  }));
}

function buildExceptionRows(
  data: Record<string, unknown> | null | undefined,
): DpmCommandCenterExceptionRow[] {
  const records = extractRecordsFromArrayOrRecord(
    data?.items || data?.exceptions || data?.monitoring_exceptions,
  );
  return records.map((record, index) => ({
    key:
      readString(record, "exception_id") ||
      readString(record, "monitoring_exception_id") ||
      `exception-${index + 1}`,
    exceptionId:
      readString(record, "exception_id") ||
      readString(record, "monitoring_exception_id") ||
      "N/A",
    mandateId: readString(record, "mandate_id") || "N/A",
    severity: readString(record, "severity") || "N/A",
    reasonCode: readString(record, "reason_code") || "N/A",
    recommendedAction: readString(record, "recommended_action") || "N/A",
    state: readString(record, "state") || readString(record, "status") || "N/A",
  }));
}

function buildHealthDimensionRow(
  record: Record<string, unknown>,
  index: number,
): DpmCommandCenterHealthDimensionRow {
  const dimension = readString(record, "dimension") || `dimension-${index + 1}`;
  return {
    key: `${dimension}-${index}`,
    dimension,
    score: formatValue(readValue(record, "score")),
    state: readString(record, "state") || "N/A",
    reasons: extractStringArray(record.reason_codes).join(", ") || "N/A",
  };
}

function extractRecordsFromArrayOrRecord(
  value: unknown,
): Record<string, unknown>[] {
  const records = extractRecordArray(value);
  if (records.length > 0) {
    return records;
  }
  const record = readRecord(value);
  return Object.entries(record).map(([key, item]) =>
    isRecord(item) ? { key, ...item } : { key, count: item },
  );
}

function extractRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readValue(record: Record<string, unknown>, key: string): unknown {
  return record[key];
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

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "N/A";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return JSON.stringify(value);
}

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeState(state: string): string {
  return state.trim().toUpperCase() || "UNKNOWN";
}
