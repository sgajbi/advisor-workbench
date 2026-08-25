export type BusinessCopyProjection = {
  label: string;
  sourceValue: string | null;
  known: boolean;
};

const BUSINESS_STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ACTIVE: "Open",
  ACCEPTED: "Accepted",
  ACTION_REQUIRED: "Action required",
  AVAILABLE: "Available",
  AWAITING_REVIEW: "Awaiting review",
  BALANCED: "Balanced",
  BLOCKED: "Blocked",
  COMPLETE: "Complete",
  DEGRADED: "Needs attention",
  EMPTY: "Not available",
  ERROR: "Unavailable",
  FAILED: "Unavailable",
  FRESH: "Fresh",
  HEALTHY: "Healthy",
  HIGH: "High",
  LOW: "Low",
  MEDIUM: "Medium",
  MISSING: "Missing",
  NOT_GENERATED: "Not generated",
  NOT_REQUESTED: "Not requested",
  OPEN: "Open",
  PASS: "Passed",
  PARTIAL: "Needs attention",
  PENDING: "In progress",
  PENDING_REVIEW: "Pending review",
  PM_REVIEW_REQUIRED: "Portfolio manager review required",
  READY: "Ready",
  REVIEW_REQUIRED: "Review required",
  SIMULATION_READY: "Ready to simulate",
  SOURCE_CHECKED: "Data checked",
  SUCCEEDED: "Complete",
  SUBMITTED: "Submitted",
  SUPPORTED: "Supported",
  STALE: "Stale",
  UNKNOWN: "Review required",
  UNAVAILABLE: "Unavailable",
  UNSUPPORTED: "Not supported",
});

const BUSINESS_REASON_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ACTION_REGISTER_CURRENT: "Action register current",
  ALLOCATION_DRIFT: "Allocation drift",
  ALLOCATION_DRIFT_NOT_ASSESSED: "Allocation drift not assessed",
  ASSET_ALLOCATION_RANGE: "Asset allocation range",
  CAMPAIGN_DEFINITION_ACTOR_NOT_ENTITLED: "Permission required",
  COUNTERPARTY_SELECTION: "Counterparty selection",
  DPM_SOURCE_STALE: "Mandate data requires refresh",
  DRIFT_REDUCTION: "Drift reduction",
  ELIGIBLE_INSTRUMENT_SELECTION: "Eligible instrument selection",
  EXTERNAL_ELIGIBLE_HEDGE_INSTRUMENT: "Eligible hedge instrument evidence",
  EXTERNAL_ELIGIBLE_HEDGE_INSTRUMENTS_FAIL_CLOSED:
    "Eligible hedge instrument evidence unavailable",
  EXTERNAL_HEDGE_POLICY: "External hedge policy",
  EXTERNAL_HEDGE_POLICY_FAIL_CLOSED: "External hedge policy unavailable",
  EXTERNAL_OMS_ORDER_EXECUTION_ACKNOWLEDGEMENT:
    "External order acknowledgement",
  EXTERNAL_OMS_SOURCE_NOT_INGESTED: "Order acknowledgement source unavailable",
  EXTERNAL_ORDER_EXECUTION_ACKNOWLEDGEMENT_FAIL_CLOSED:
    "Order acknowledgement evidence unavailable",
  HEDGE_POLICY_APPROVAL: "Hedge policy approval",
  BEST_EXECUTION: "Best-execution review",
  FILLS: "Trade fills",
  MANDATE_ATTENTION_REQUIRED: "Mandate review required",
  OMS_ACKNOWLEDGEMENT: "Order-system acknowledgement",
  ORDER_GENERATION: "Order generation",
  PERFORMANCE_WORKSPACE_SUMMARY_UNAVAILABLE: "Performance summary unavailable",
  PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED: "Fairness review required",
  PM_QUALITY_REVIEW_ACTION_READY: "Supervisory review ready",
  PRICE_STALE: "Stale price",
  PRODUCT_RECOMMENDATION: "Product recommendation",
  PROOF_PACK_READY: "Evidence pack ready",
  OUTCOME_REVIEW_READY: "Outcome review ready",
  PREVIEW_WAVE: "Preview rebalance wave",
  CREATE_WAVE: "Create rebalance wave",
  SEGMENT_MINIMUM_SCORE_RUNS_NOT_MET: "Insufficient segment evidence",
  SIMULATE_REBALANCE: "Simulate rebalance",
  SOURCE_READY: "Ready",
  SOURCE_READINESS_BLOCKED: "Data readiness blocked",
  SOURCE_READINESS_INCOMPLETE: "Data readiness incomplete",
  SOURCE_RISK_HEALTH_ATTENTION: "Risk posture requires review",
  SUSTAINABILITY_REVIEW_REQUIRED: "Sustainability review required",
  TAX_LOT_SOURCE_PARTIAL: "Tax-lot data is incomplete",
  TREASURY_INSTRUCTION: "Treasury instruction",
  SETTLEMENT: "Settlement",
  VENUE_ROUTING: "Venue routing",
});

const warnedUnknownValues = new Set<string>();
const UNKNOWN_WARNING_LIMIT = 128;

export function projectBusinessState(
  value: string | number | null | undefined,
): BusinessCopyProjection {
  const sourceValue = normalizeSourceValue(value);
  if (!sourceValue || sourceValue.toUpperCase() === "N/A") {
    return { label: "Not available", sourceValue, known: true };
  }

  const label = BUSINESS_STATE_LABELS[normalizeLookupKey(sourceValue)];
  if (label) {
    return { label, sourceValue, known: true };
  }

  warnUnknownBusinessCopy("state", sourceValue);
  return { label: "Review required", sourceValue, known: false };
}

export function businessStateLabel(
  value: string | number | null | undefined,
): string {
  return projectBusinessState(value).label;
}

export function projectBusinessReason(
  value: string | null | undefined,
): BusinessCopyProjection {
  const sourceValue = normalizeSourceValue(value);
  if (
    !sourceValue ||
    sourceValue === "-" ||
    sourceValue.toUpperCase() === "N/A"
  ) {
    return { label: "-", sourceValue, known: true };
  }

  const normalized = normalizeLookupKey(sourceValue);
  const exactLabel = BUSINESS_REASON_LABELS[normalized];
  if (exactLabel) {
    return { label: exactLabel, sourceValue, known: true };
  }

  const patternLabel = businessReasonPatternLabel(normalized);
  if (patternLabel) {
    return { label: patternLabel, sourceValue, known: true };
  }

  const stateLabel = BUSINESS_STATE_LABELS[normalized];
  if (stateLabel) {
    return { label: stateLabel, sourceValue, known: true };
  }

  warnUnknownBusinessCopy("reason", sourceValue);
  return { label: "Review required", sourceValue, known: false };
}

export function formatBusinessReason(value: string | null | undefined): string {
  return projectBusinessReason(value).label;
}

function businessReasonPatternLabel(normalized: string): string | null {
  if (normalized.includes("UNAVAILABLE")) {
    return "Unavailable";
  }
  if (normalized.includes("MAPPING")) {
    return "Mapping review";
  }
  if (normalized.includes("CASH")) {
    return "Cash range";
  }
  return null;
}

function normalizeSourceValue(
  value: string | number | null | undefined,
): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLookupKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
}

function warnUnknownBusinessCopy(
  family: "reason" | "state",
  sourceValue: string,
): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const warningKey = `${family}:${sourceValue}`;
  if (warnedUnknownValues.has(warningKey)) {
    return;
  }
  if (warnedUnknownValues.size >= UNKNOWN_WARNING_LIMIT) {
    return;
  }

  warnedUnknownValues.add(warningKey);
  console.warn(
    `[business-copy] Unmapped ${family} value rendered as Review required: ${sourceValue}`,
  );
}
