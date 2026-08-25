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
  DPM_SOURCE_STALE: "Mandate data requires refresh",
  PERFORMANCE_WORKSPACE_SUMMARY_UNAVAILABLE: "Performance summary unavailable",
  PRICE_STALE: "Stale price",
  SIMULATE_REBALANCE: "Simulate rebalance",
  SOURCE_READY: "Ready",
  SOURCE_RISK_HEALTH_ATTENTION: "Risk posture requires review",
  SUSTAINABILITY_REVIEW_REQUIRED: "Sustainability review required",
  TAX_LOT_SOURCE_PARTIAL: "Tax-lot data is incomplete",
});

export function projectBusinessState(
  value: string | number | null | undefined,
): BusinessCopyProjection {
  const sourceValue = normalizeSourceValue(value);
  if (!sourceValue || sourceValue.toUpperCase() === "N/A") {
    return { label: "Not available", sourceValue, known: true };
  }

  const label = BUSINESS_STATE_LABELS[sourceValue.toUpperCase()];
  return label
    ? { label, sourceValue, known: true }
    : { label: "Review required", sourceValue, known: false };
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

  const stateProjection = projectBusinessState(sourceValue);
  return stateProjection.known
    ? stateProjection
    : { label: "Review required", sourceValue, known: false };
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
