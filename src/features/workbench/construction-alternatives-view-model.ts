import type { DpmConstructionGatewayResponse } from "./types";

export type ConstructionPanelState =
  | "idle"
  | "ready"
  | "partial"
  | "blocked"
  | "unsupported"
  | "unavailable";

export type ConstructionMetricRow = {
  key: string;
  label: string;
  value: string;
};

export type ConstructionAlternativeRow = {
  alternativeId: string;
  method: string;
  status: string;
  label: string;
  rationale: string;
  turnoverPct: string;
  cashAfterPct: string;
  riskDelta: string;
  trackingErrorDeltaBps: string;
  tradeCount: string;
  metrics: ConstructionMetricRow[];
  reasonCodes: string[];
  objectiveTraceCount: number;
  constraintTraceCount: number;
};

export type ConstructionConstraintRow = {
  key: string;
  name: string;
  state: string;
  current: string;
  after: string;
};

export type ConstructionSourceReadinessRow = {
  key: string;
  source: string;
  state: string;
  lastUpdated: string;
  reasonCode: string;
};

export type ConstructionPanelModel = {
  state: ConstructionPanelState;
  supportabilityState: string;
  supportabilityReasons: string[];
  selectedAlternativeId: string | null;
  sourceService: string;
  authority: string;
  correlationId: string;
  alternativeSetId: string;
  alternativeSetState: string;
  objective: string;
  alternatives: ConstructionAlternativeRow[];
  selectedAlternative: ConstructionAlternativeRow | null;
  constraints: ConstructionConstraintRow[];
  sourceReadiness: ConstructionSourceReadinessRow[];
};

export function buildConstructionPanelModel(
  response: DpmConstructionGatewayResponse | null,
): ConstructionPanelModel {
  if (!response) {
    return {
      state: "idle",
      supportabilityState: "NOT_GENERATED",
      supportabilityReasons: ["CONSTRUCTION_ALTERNATIVES_NOT_REQUESTED"],
      selectedAlternativeId: null,
      sourceService: "lotus-gateway",
      authority: "lotus-manage:RFC-0039",
      correlationId: "N/A",
      alternativeSetId: "N/A",
      alternativeSetState: "NOT_GENERATED",
      objective: "Generate a construction alternative set to review objective and constraint fit.",
      alternatives: [],
      selectedAlternative: null,
      constraints: [],
      sourceReadiness: [],
    };
  }

  const records = extractRecordArray(response.data.alternatives);
  const supportabilityState = resolveSupportabilityState(
    normalizeState(response.supportability.state),
    records,
  );
  const alternatives = records.map(buildAlternativeRow);
  const selectedAlternativeId =
    (response.supportability.selected_alternative_id ??
      readString(response.data, "selected_alternative_id")) ||
    null;
  return {
    state: resolvePanelState(supportabilityState, records.length),
    supportabilityState,
    supportabilityReasons: response.supportability.reason_codes,
    selectedAlternativeId,
    sourceService:
      response.supportability.source_service || response.source_service,
    authority: response.supportability.authority,
    correlationId: response.correlation_id,
    alternativeSetId: readString(response.data, "alternative_set_id") || "N/A",
    alternativeSetState:
      readString(response.data, "state") ||
      readString(response.data, "status") ||
      supportabilityState,
    objective:
      readString(response.data, "objective") ||
      readString(response.data, "objective_description") ||
      readString(readRecord(response.data.objective), "description") ||
      readString(readRecord(response.data.objective), "label") ||
      "No objective summary available for this alternative set.",
    alternatives,
    selectedAlternative:
      alternatives.find((alternative) => alternative.alternativeId === selectedAlternativeId) ??
      alternatives.find((alternative) => alternative.status.includes("RECOMMENDED")) ??
      alternatives[0] ??
      null,
    constraints: buildConstraintRows(response.data, records),
    sourceReadiness: buildSourceReadinessRows(response.data),
  };
}

function resolvePanelState(
  supportabilityState: string,
  alternativeCount: number,
): ConstructionPanelState {
  if (supportabilityState === "BLOCKED") {
    return "blocked";
  }
  if (supportabilityState === "UNSUPPORTED") {
    return "unsupported";
  }
  if (supportabilityState === "DEGRADED" || supportabilityState === "UNKNOWN") {
    return alternativeCount > 0 ? "partial" : "unavailable";
  }
  return alternativeCount > 0 ? "ready" : "unavailable";
}

function resolveSupportabilityState(
  gatewayState: string,
  alternatives: Record<string, unknown>[],
): string {
  if (gatewayState !== "UNKNOWN" || alternatives.length === 0) {
    return gatewayState;
  }
  const states = alternatives.map((record) =>
    normalizeState(
      readString(record, "method_status") || readString(record, "status"),
    ),
  );
  if (states.every((state) => state === "READY")) {
    return "READY";
  }
  if (states.some((state) => state === "BLOCKED" || state === "UNSUPPORTED")) {
    return (
      states.find((state) => state === "BLOCKED" || state === "UNSUPPORTED") ??
      "UNKNOWN"
    );
  }
  if (
    states.some((state) => state === "DEGRADED" || state.includes("REVIEW"))
  ) {
    return "DEGRADED";
  }
  return gatewayState;
}

function buildAlternativeRow(
  record: Record<string, unknown>,
  index: number,
): ConstructionAlternativeRow {
  const alternativeId =
    readString(record, "alternative_id") || `alternative-${index + 1}`;
  const diagnostics = readRecord(record.diagnostics);
  const methodPlan = readRecord(diagnostics.method_plan);
  const enrichment = readRecord(diagnostics.enrichment_summary);
  return {
    alternativeId,
    method:
      readString(record, "method") ||
      readString(record, "target_method") ||
      "UNKNOWN",
    status:
      readString(record, "method_status") ||
      readString(record, "status") ||
      "UNKNOWN",
    label: readString(record, "label") || readString(record, "name") || alternativeId,
    rationale:
      readString(record, "rationale") ||
      readString(record, "summary") ||
      readString(diagnostics, "rationale") ||
      "No rationale available.",
    turnoverPct: readMetricValue(record, ["turnover_pct", "turnover_percent", "turnover_weight"]),
    cashAfterPct: readMetricValue(record, ["cash_after_pct", "cash_weight_after", "cash_weight"]),
    riskDelta: readMetricValue(record, ["risk_delta", "risk_score_delta", "risk_delta_value"]),
    trackingErrorDeltaBps: readMetricValue(record, [
      "expected_tracking_error_delta_bps",
      "te_delta_bps",
      "tracking_error_delta_bps",
    ]),
    tradeCount: readMetricValue(record, ["trade_count", "trades", "order_count"]),
    metrics: buildMetricRows(record),
    reasonCodes: uniqueStrings([
      ...extractStringArray(record.reason_codes),
      ...extractStringArray(methodPlan.reason_codes),
      ...extractStringArray(enrichment.reason_codes),
    ]),
    objectiveTraceCount: extractRecordArray(record.objective_trace).length,
    constraintTraceCount: extractRecordArray(record.constraint_trace).length,
  };
}

function buildConstraintRows(
  data: Record<string, unknown>,
  alternatives: Record<string, unknown>[],
): ConstructionConstraintRow[] {
  const directRows = extractRecordArray(data.constraints ?? data.constraint_fit ?? data.constraint_matrix);
  const selectedAlternativeId = readString(data, "selected_alternative_id");
  const selected =
    alternatives.find((record) => readString(record, "alternative_id") === selectedAlternativeId) ??
    alternatives[0];
  const traceRows = extractRecordArray(selected?.constraint_trace);
  const records = directRows.length > 0 ? directRows : traceRows;

  return records.map((record, index) => {
    const name =
      readString(record, "name") ||
      readString(record, "constraint") ||
      readString(record, "rule") ||
      readString(record, "constraint_name") ||
      `Constraint ${index + 1}`;
    return {
      key: `${name}-${index}`,
      name,
      state: normalizeState(
        readString(record, "state") ||
          readString(record, "status") ||
          readString(record, "after_state") ||
          readString(record, "result"),
      ),
      current:
        readString(record, "current") ||
        readString(record, "current_state") ||
        readString(record, "before") ||
        readString(record, "before_state") ||
        "N/A",
      after:
        readString(record, "after") ||
        readString(record, "after_state") ||
        readString(record, "projected") ||
        readString(record, "projected_state") ||
        "N/A",
    };
  });
}

function buildSourceReadinessRows(data: Record<string, unknown>): ConstructionSourceReadinessRow[] {
  const records = extractRecordsFromUnknownMap(
    data.source_readiness ?? data.source_readiness_summary ?? data.sources,
    "source",
  );
  return records.map((record, index) => {
    const source =
      readString(record, "source") ||
      readString(record, "source_service") ||
      readString(record, "source_system") ||
      `source-${index + 1}`;
    return {
      key: `${source}-${index}`,
      source,
      state: normalizeState(readString(record, "state") || readString(record, "status")),
      lastUpdated:
        readString(record, "last_updated") ||
        readString(record, "last_updated_at") ||
        readString(record, "as_of_utc") ||
        "N/A",
      reasonCode:
        readString(record, "reason_code") ||
        extractStringArray(record.reason_codes).join(", ") ||
        "-",
    };
  });
}

function buildMetricRows(
  record: Record<string, unknown>,
): ConstructionMetricRow[] {
  const metrics = readRecord(record.comparison_metrics);
  return Object.entries(metrics).map(([key, value]) => ({
    key,
    label: key.replaceAll("_", " "),
    value: formatValue(value),
  }));
}

function readMetricValue(record: Record<string, unknown>, keys: string[]): string {
  const metrics = readRecord(record.comparison_metrics);
  for (const key of keys) {
    const direct = record[key];
    const metric = metrics[key];
    if (direct !== undefined && direct !== null) {
      return formatValue(direct);
    }
    if (metric !== undefined && metric !== null) {
      return formatValue(metric);
    }
  }
  return "N/A";
}

function extractRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function extractRecordsFromUnknownMap(value: unknown, keyName: string): Record<string, unknown>[] {
  const arrayRecords = extractRecordArray(value);
  if (arrayRecords.length > 0) {
    return arrayRecords;
  }
  const record = readRecord(value);
  return Object.entries(record).map(([key, item]) =>
    isRecord(item) ? { [keyName]: key, ...item } : { [keyName]: key, state: item },
  );
}

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
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
  return JSON.stringify(value);
}

function normalizeState(state: string): string {
  return state.trim().toUpperCase() || "UNKNOWN";
}
