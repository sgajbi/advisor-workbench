export type BusinessCopyProjection = {
  label: string;
  sourceValue: string | null;
  known: boolean;
};

const BUSINESS_STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ACTIVE: "Open",
  ACCEPTED: "Accepted",
  AVAILABLE: "Available",
  AWAITING_REVIEW: "Awaiting review",
  BALANCED: "Balanced",
  BLOCKED: "Blocked",
  COMPLETE: "Complete",
  DEGRADED: "Needs attention",
  EMPTY: "Not available",
  ERROR: "Unavailable",
  FAILED: "Unavailable",
  HIGH: "High",
  LOW: "Low",
  MEDIUM: "Medium",
  MISSING: "Missing",
  NOT_GENERATED: "Not generated",
  NOT_REQUESTED: "Not requested",
  OPEN: "Open",
  PARTIAL: "Needs attention",
  PENDING: "In progress",
  PENDING_REVIEW: "Pending review",
  PM_REVIEW_REQUIRED: "Portfolio manager review required",
  READY: "Ready",
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
  ALLOCATION_DRIFT_NOT_ASSESSED: "Allocation drift not assessed",
  COUNTERPARTY_SELECTION: "Counterparty selection",
  DPM_SOURCE_STALE: "Mandate data requires refresh",
  DRIFT_REDUCTION: "Drift reduction",
  ELIGIBLE_INSTRUMENT_SELECTION: "Eligible instrument selection",
  EXTERNAL_ELIGIBLE_HEDGE_INSTRUMENTS_FAIL_CLOSED:
    "Eligible hedge instrument evidence unavailable",
  EXTERNAL_HEDGE_POLICY: "External hedge policy",
  EXTERNAL_HEDGE_POLICY_FAIL_CLOSED: "External hedge policy unavailable",
  EXTERNAL_OMS_ORDER_EXECUTION_ACKNOWLEDGEMENT:
    "External order acknowledgement",
  EXTERNAL_ORDER_EXECUTION_ACKNOWLEDGEMENT_FAIL_CLOSED:
    "Order acknowledgement evidence unavailable",
  HEDGE_POLICY_APPROVAL: "Hedge policy approval",
  OMS_ACKNOWLEDGEMENT: "Order-system acknowledgement",
  ORDER_GENERATION: "Order generation",
  PERFORMANCE_WORKSPACE_SUMMARY_UNAVAILABLE: "Performance summary unavailable",
  PRICE_STALE: "Stale price",
  PRODUCT_RECOMMENDATION: "Product recommendation",
  SIMULATE_REBALANCE: "Simulate rebalance",
  SOURCE_READY: "Ready",
  SOURCE_RISK_HEALTH_ATTENTION: "Risk posture requires review",
  SUSTAINABILITY_REVIEW_REQUIRED: "Sustainability review required",
  TAX_LOT_SOURCE_PARTIAL: "Tax-lot data is incomplete",
  TREASURY_INSTRUCTION: "Treasury instruction",
});

const warnedUnknownValues = new Set<string>();

export function projectBusinessState(
  value: string | number | null | undefined,
): BusinessCopyProjection {
  const sourceValue = normalizeSourceValue(value);
  if (!sourceValue || sourceValue.toUpperCase() === "N/A") {
    return { label: "Not available", sourceValue, known: true };
  }

  const label = BUSINESS_STATE_LABELS[sourceValue.toUpperCase()];
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

  const normalized = sourceValue.toUpperCase();
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

  warnedUnknownValues.add(warningKey);
  console.warn(
    `[business-copy] Unmapped ${family} value rendered as Review required: ${sourceValue}`,
  );
}
