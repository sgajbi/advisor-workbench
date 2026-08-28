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
  objective: string;
  mandateFit: string;
  actionLabel: string;
  isRecommended: boolean;
  rationale: string;
  turnoverPct: string;
  cashAfterPct: string;
  driftImprovementPct: string;
  riskDelta: string;
  trackingErrorDeltaBps: string;
  tradeCount: string;
  metrics: ConstructionMetricRow[];
  reasonCodes: string[];
  objectiveTraceCount: number;
  constraintTraceCount: number;
};

export type ConstructionAllocationRow = {
  key: string;
  label: string;
  before: string;
  after: string;
  beforeWidth: string;
  afterWidth: string;
};

export type ConstructionTradeImpact = {
  tradeCount: string;
  buyCount: string;
  trimCount: string;
  cashReductionCount: string;
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
  reasonCode: string;
};

export type ConstructionCurrencyOverlayEvidence = {
  state: string;
  sourceProductName: string;
  sourceProductVersion: string;
  sourceId: string;
  contentHash: string;
  ruleCount: string;
  rules: string[];
  eligibleInstrumentEvidence: ConstructionEligibleInstrumentEvidence | null;
  missingDataFamilies: string[];
  blockedCapabilities: string[];
  reasonCodes: string[];
};

export type ConstructionEligibleInstrumentEvidence = {
  sourceProductName: string;
  sourceProductVersion: string;
  sourceId: string;
  contentHash: string;
  instrumentCount: string;
  instruments: string[];
};

export type ConstructionExecutionAcknowledgementEvidence = {
  state: string;
  sourceProductName: string;
  sourceProductVersion: string;
  sourceId: string;
  contentHash: string;
  acknowledgementCount: string;
  acknowledgements: string[];
  missingDataFamilies: string[];
  blockedCapabilities: string[];
  reasonCodes: string[];
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
  recommendedPathLabel: string;
  mandateFitLabel: string;
  driftImprovementLabel: string;
  approvalReadinessLabel: string;
  selectedBusinessRationale: string;
  allocationRows: ConstructionAllocationRow[];
  tradeImpact: ConstructionTradeImpact;
  alternatives: ConstructionAlternativeRow[];
  selectedAlternative: ConstructionAlternativeRow | null;
  constraints: ConstructionConstraintRow[];
  sourceReadiness: ConstructionSourceReadinessRow[];
  currencyOverlayEvidence: ConstructionCurrencyOverlayEvidence | null;
  executionAcknowledgementEvidence: ConstructionExecutionAcknowledgementEvidence | null;
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
      recommendedPathLabel: "Not generated",
      mandateFitLabel: "Not available",
      driftImprovementLabel: "Not available",
      approvalReadinessLabel: "Not generated",
      selectedBusinessRationale: "Generate alternatives to compare implementation paths.",
      allocationRows: [],
      tradeImpact: {
        tradeCount: "N/A",
        buyCount: "N/A",
        trimCount: "N/A",
        cashReductionCount: "N/A",
      },
      alternatives: [],
      selectedAlternative: null,
      constraints: [],
      sourceReadiness: [],
      currencyOverlayEvidence: null,
      executionAcknowledgementEvidence: null,
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
  const selectedRecord =
    records.find((record) => readString(record, "alternative_id") === selectedAlternativeId) ??
    records.find((record) => readBoolean(record, "recommended")) ??
    records[0] ??
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
      alternatives.find((alternative) => alternative.isRecommended) ??
      alternatives[0] ??
      null,
    recommendedPathLabel: recommendedPathLabel(alternatives),
    mandateFitLabel: mandateFitLabel(alternatives, response.data),
    driftImprovementLabel: driftImprovementLabel(alternatives),
    approvalReadinessLabel: approvalReadinessLabel(supportabilityState, response.data),
    selectedBusinessRationale: selectedBusinessRationale(
      alternatives.find((alternative) => alternative.alternativeId === selectedAlternativeId) ??
        alternatives.find((alternative) => alternative.isRecommended) ??
        alternatives[0] ??
        null,
    ),
    allocationRows: buildAllocationRows(response.data),
    tradeImpact: buildTradeImpact(response.data, alternatives),
    constraints: buildConstraintRows(response.data, records),
    sourceReadiness: buildSourceReadinessRows(response.data),
    currencyOverlayEvidence: buildCurrencyOverlayEvidence(selectedRecord),
    executionAcknowledgementEvidence: buildExecutionAcknowledgementEvidence(selectedRecord),
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
  if (
    supportabilityState === "DEGRADED" ||
    supportabilityState === "PARTIAL" ||
    supportabilityState === "UNKNOWN"
  ) {
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
  const status =
    readString(record, "method_status") ||
    readString(record, "status") ||
    "UNKNOWN";
  const label = readString(record, "label") || readString(record, "name") || businessAlternativeLabel(alternativeId, index);
  const isRecommended =
    readBoolean(record, "recommended") ||
    normalizeState(readString(record, "rank") || readString(record, "recommendation")).includes("RECOMMENDED") ||
    normalizeState(status).includes("RECOMMENDED") ||
    index === 0;
  return {
    alternativeId,
    method:
      readString(record, "method") ||
      readString(record, "target_method") ||
      "UNKNOWN",
    status,
    label,
    objective:
      readString(record, "objective") ||
      readString(record, "objective_summary") ||
      readString(record, "summary") ||
      "No objective returned for this path.",
    mandateFit:
      readString(record, "mandate_fit") ||
      readString(record, "constraint_fit") ||
      mandateFitForState(status),
    actionLabel: isRecommended ? "Review" : "Compare",
    isRecommended,
    rationale:
      readString(record, "rationale") ||
      readString(record, "summary") ||
      readString(diagnostics, "rationale") ||
      "No business rationale returned for this path.",
    turnoverPct: readMetricValue(record, ["turnover_pct", "turnover_percent", "turnover_weight"]),
    cashAfterPct: readMetricValue(record, ["cash_after_pct", "cash_weight_after", "cash_weight"]),
    driftImprovementPct: readMetricValue(record, [
      "drift_improvement_pct",
      "drift_reduction_pct",
      "drift_improvement_percent",
    ]),
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
      reasonCode:
        readString(record, "reason_code") ||
        extractStringArray(record.reason_codes).join(", ") ||
        "-",
    };
  });
}

function buildCurrencyOverlayEvidence(
  record: Record<string, unknown> | null,
): ConstructionCurrencyOverlayEvidence | null {
  if (!record) {
    return null;
  }
  const diagnostics = readRecord(record.diagnostics);
  const authorityContext = readRecord(diagnostics.authority_context);
  const context = readRecord(authorityContext.currency_overlay_context);
  if (Object.keys(context).length === 0) {
    return null;
  }
  const sourceProductName = readString(
    context,
    "external_hedge_policy_source_product_name",
  );
  const sourceId = readString(context, "external_hedge_policy_source_id");
  const contentHash = readString(context, "external_hedge_policy_content_hash");
  const missingDataFamilies = extractStringArray(context.missing_data_families);
  const blockedCapabilities = extractStringArray(context.blocked_capabilities);
  const reasonCodes = extractStringArray(context.reason_codes);
  const rules = extractDisplayArray(context.external_hedge_policy_rules);
  const eligibleInstrumentEvidence = buildEligibleInstrumentEvidence(context);

  if (
    !sourceProductName &&
    !sourceId &&
    !contentHash &&
    !eligibleInstrumentEvidence &&
    missingDataFamilies.length === 0 &&
    blockedCapabilities.length === 0 &&
    reasonCodes.length === 0
  ) {
    return null;
  }

  return {
    state:
      readString(context, "supportability_status") ||
      readString(context, "state") ||
      "UNKNOWN",
    sourceProductName: sourceProductName || "External hedge policy",
    sourceProductVersion:
      readString(context, "external_hedge_policy_source_product_version") ||
      "N/A",
    sourceId: sourceId || "N/A",
    contentHash: contentHash || "N/A",
    ruleCount: readCountLabel(context.external_hedge_policy_rule_count),
    rules,
    eligibleInstrumentEvidence,
    missingDataFamilies,
    blockedCapabilities,
    reasonCodes,
  };
}

function buildEligibleInstrumentEvidence(
  context: Record<string, unknown>,
): ConstructionEligibleInstrumentEvidence | null {
  const sourceProductName = readString(
    context,
    "external_eligible_hedge_instrument_source_product_name",
  );
  const sourceProductVersion = readString(
    context,
    "external_eligible_hedge_instrument_source_product_version",
  );
  const sourceId = readString(
    context,
    "external_eligible_hedge_instrument_source_id",
  );
  const contentHash = readString(
    context,
    "external_eligible_hedge_instrument_content_hash",
  );
  const instruments = extractDisplayArray(
    context.external_eligible_hedge_instruments,
  );

  if (
    !sourceProductName &&
    !sourceProductVersion &&
    !sourceId &&
    !contentHash &&
    instruments.length === 0
  ) {
    return null;
  }

  return {
    sourceProductName: sourceProductName || "External eligible hedge instruments",
    sourceProductVersion: sourceProductVersion || "N/A",
    sourceId: sourceId || "N/A",
    contentHash: contentHash || "N/A",
    instrumentCount: readCountLabel(
      context.external_eligible_hedge_instrument_count,
    ),
    instruments,
  };
}

function buildExecutionAcknowledgementEvidence(
  record: Record<string, unknown> | null,
): ConstructionExecutionAcknowledgementEvidence | null {
  if (!record) {
    return null;
  }
  const diagnostics = readRecord(record.diagnostics);
  const authorityContext = readRecord(diagnostics.authority_context);
  const context = readRecord(authorityContext.execution_acknowledgement_context);
  if (Object.keys(context).length === 0) {
    return null;
  }
  const sourceProductName = readString(context, "source_product_name");
  const sourceProductVersion = readString(context, "source_product_version");
  const sourceId = readString(context, "source_id");
  const contentHash = readString(context, "content_hash");
  const acknowledgements = extractDisplayArray(context.acknowledgements);
  const missingDataFamilies = extractStringArray(context.missing_data_families);
  const blockedCapabilities = extractStringArray(context.blocked_capabilities);
  const reasonCodes = extractStringArray(context.reason_codes);

  if (
    !sourceProductName &&
    !sourceProductVersion &&
    !sourceId &&
    !contentHash &&
    acknowledgements.length === 0 &&
    missingDataFamilies.length === 0 &&
    blockedCapabilities.length === 0 &&
    reasonCodes.length === 0
  ) {
    return null;
  }

  return {
    state:
      readString(context, "supportability_status") ||
      readString(context, "state") ||
      "UNKNOWN",
    sourceProductName: sourceProductName || "External order execution acknowledgement",
    sourceProductVersion: sourceProductVersion || "N/A",
    sourceId: sourceId || "N/A",
    contentHash: contentHash || "N/A",
    acknowledgementCount: readCountLabel(context.acknowledgement_count),
    acknowledgements,
    missingDataFamilies,
    blockedCapabilities,
    reasonCodes,
  };
}

function recommendedPathLabel(alternatives: ConstructionAlternativeRow[]): string {
  return alternatives.find((alternative) => alternative.isRecommended)?.label ?? alternatives[0]?.label ?? "Not available";
}

function mandateFitLabel(alternatives: ConstructionAlternativeRow[], data: Record<string, unknown>): string {
  const direct = readString(data, "mandate_fit") || readString(data, "constraint_fit");
  if (direct) {
    return businessStateText(direct);
  }
  const recommended = alternatives.find((alternative) => alternative.isRecommended) ?? alternatives[0];
  return recommended?.mandateFit ?? "Not available";
}

function driftImprovementLabel(alternatives: ConstructionAlternativeRow[]): string {
  const recommended = alternatives.find((alternative) => alternative.isRecommended) ?? alternatives[0];
  return recommended?.driftImprovementPct !== "N/A" ? recommended?.driftImprovementPct ?? "Not available" : "Not available";
}

function approvalReadinessLabel(supportabilityState: string, data: Record<string, unknown>): string {
  const direct = readString(data, "approval_readiness") || readString(data, "approval_state");
  const normalized = normalizeState(direct || supportabilityState);
  if (normalized === "READY" || normalized === "SUPPORTED") {
    return "Ready";
  }
  if (normalized.includes("BLOCKED")) {
    return "Blocked";
  }
  if (normalized.includes("REVIEW") || normalized.includes("PARTIAL") || normalized.includes("DEGRADED")) {
    return "Needs Review";
  }
  return businessStateText(direct || supportabilityState);
}

function selectedBusinessRationale(alternative: ConstructionAlternativeRow | null): string {
  return alternative?.rationale ?? "Generate alternatives to review business rationale.";
}

function buildAllocationRows(data: Record<string, unknown>): ConstructionAllocationRow[] {
  const directRows = extractRecordArray(data.allocation_comparison);
  const fallbackRows = extractRecordArray(data.before_after_allocation);
  const records =
    directRows.length > 0
      ? directRows
      : fallbackRows.length > 0
        ? fallbackRows
        : [];
  return records.map((record, index) => {
    const label =
      readString(record, "label") ||
      readString(record, "asset_class") ||
      readString(record, "name") ||
      `Allocation ${index + 1}`;
    const before = readString(record, "before") || readString(record, "current") || readMetricValue(record, ["before_pct", "current_pct"]);
    const after = readString(record, "after") || readString(record, "target") || readMetricValue(record, ["after_pct", "target_pct"]);
    return {
      key: `${label}-${index}`,
      label: businessStateText(label),
      before,
      after,
      beforeWidth: percentWidth(before),
      afterWidth: percentWidth(after),
    };
  });
}

function buildTradeImpact(data: Record<string, unknown>, alternatives: ConstructionAlternativeRow[]): ConstructionTradeImpact {
  const tradeImpact = readRecord(data.trade_impact);
  const tradeImpactSummary = readRecord(data.trade_impact_summary);
  const impact = Object.keys(tradeImpact).length > 0 ? tradeImpact : tradeImpactSummary;
  const recommended = alternatives.find((alternative) => alternative.isRecommended) ?? alternatives[0];
  return {
    tradeCount: readString(impact, "trade_count") || recommended?.tradeCount || "N/A",
    buyCount: readString(impact, "buy_count") || readString(impact, "buys") || "N/A",
    trimCount: readString(impact, "trim_count") || readString(impact, "trims") || "N/A",
    cashReductionCount:
      readString(impact, "cash_reduction_count") ||
      readString(impact, "cash_reductions") ||
      "N/A",
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

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
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

function extractDisplayArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) =>
    typeof item === "string" ? item : JSON.stringify(item),
  );
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function readCountLabel(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString();
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return "N/A";
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
    const numeric = Number.parseFloat(value);
    if (Number.isFinite(numeric) && String(numeric) === value.trim()) {
      if (Math.abs(numeric) <= 1) {
        return `${(numeric * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
      }
      return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    if (Math.abs(value) <= 1) {
      return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Math.abs(numeric) <= 1) {
        return `${(numeric * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
      }
      return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
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

function businessAlternativeLabel(alternativeId: string, index: number): string {
  const normalized = alternativeId.toLowerCase();
  if (normalized.includes("min") || normalized.includes("turnover")) {
    return "Low Turnover Path";
  }
  if (normalized.includes("risk")) {
    return "Risk Reduction Path";
  }
  if (index === 0) {
    return "Balanced Transition";
  }
  return `Alternative ${index + 1}`;
}

function mandateFitForState(state: string): string {
  const normalized = normalizeState(state);
  if (normalized.includes("READY") || normalized.includes("RECOMMENDED") || normalized.includes("PASS")) {
    return "Within Range";
  }
  if (normalized.includes("REVIEW") || normalized.includes("PARTIAL")) {
    return "Needs Review";
  }
  if (normalized.includes("BLOCKED") || normalized.includes("INFEASIBLE")) {
    return "Blocked";
  }
  return "Acceptable";
}

function businessStateText(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "N/A";
  }
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function percentWidth(value: string): string {
  const parsed = Number.parseFloat(value.replace("%", ""));
  if (!Number.isFinite(parsed)) {
    return "0%";
  }
  return `${Math.max(0, Math.min(parsed, 100))}%`;
}
