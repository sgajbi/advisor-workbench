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
  metrics: ConstructionMetricRow[];
  reasonCodes: string[];
  objectiveTraceCount: number;
  constraintTraceCount: number;
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
  alternatives: ConstructionAlternativeRow[];
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
      alternatives: [],
    };
  }

  const records = extractRecordArray(response.data.alternatives);
  const supportabilityState = resolveSupportabilityState(
    normalizeState(response.supportability.state),
    records,
  );
  return {
    state: resolvePanelState(supportabilityState, records.length),
    supportabilityState,
    supportabilityReasons: response.supportability.reason_codes,
    selectedAlternativeId:
      (response.supportability.selected_alternative_id ??
        readString(response.data, "selected_alternative_id")) ||
      null,
    sourceService:
      response.supportability.source_service || response.source_service,
    authority: response.supportability.authority,
    correlationId: response.correlation_id,
    alternativeSetId: readString(response.data, "alternative_set_id") || "N/A",
    alternatives: records.map(buildAlternativeRow),
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
