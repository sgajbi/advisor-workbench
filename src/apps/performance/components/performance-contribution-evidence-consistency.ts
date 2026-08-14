import type { ContributionSummaryView } from "@/features/workbench/types";

const SOURCE_LIMITATION_REASON_CODES = [
  "COMPONENT_PNL_NOT_SOURCE_AUTHORED",
  "PERFORMANCE_COMPONENT_ECONOMICS_UNAVAILABLE",
  "UNSUPPORTED_SOURCE_CASH_FLOW_TYPES_PRESENT",
  "UNCLASSIFIED_POSITION_ECONOMICS_PRESENT",
  "MISSING_FX",
  "MISSING_LOCAL_ECONOMICS",
] as const;

const SOURCE_LINEAGE_REASON_CODES = [
  "UPSTREAM_SNAPSHOT_LINEAGE_AVAILABLE",
  "UPSTREAM_SNAPSHOT_LINEAGE_AVAILABLE_VIA_EXECUTION_ONLY",
] as const;

const DEGRADED_ECONOMICS_REASON_CODES: Record<string, string> = {
  performance_component_economics_unavailable:
    "PERFORMANCE_COMPONENT_ECONOMICS_UNAVAILABLE",
  unsupported_cash_flow_types: "UNSUPPORTED_SOURCE_CASH_FLOW_TYPES_PRESENT",
  missing_classification: "UNCLASSIFIED_POSITION_ECONOMICS_PRESENT",
  upstream_snapshot_lineage_not_embedded:
    "UPSTREAM_SNAPSHOT_LINEAGE_AVAILABLE_VIA_EXECUTION_ONLY",
};

const COMMON_SMOOTHING_RESIDUAL_CODES = [
  "RAW_CONTRIBUTION_DIFFERS_FROM_LINKED_RETURN",
  "RESIDUAL_ALLOCATED_TO_RECONCILE_PERIOD",
] as const;

const CONTRIBUTION_RECONCILIATION_TOLERANCE_PCT = 0.005;

export function isContributionEvidenceConsistent(
  contribution: ContributionSummaryView,
  {
    sourceStatus,
    smoothingStatus,
  }: {
    sourceStatus: string;
    smoothingStatus: string;
  },
): boolean {
  return (
    isSourceEvidenceConsistent(contribution, sourceStatus) &&
    isSmoothingEvidenceConsistent(smoothingStatus, contribution.smoothing_evidence?.reason_codes) &&
    isPublishedContributionReconciled(contribution, smoothingStatus)
  );
}

function isSourceEvidenceConsistent(
  contribution: ContributionSummaryView,
  sourceStatus: string,
): boolean {
  const sourceEvidence = contribution.source_economics_evidence;
  const reasonCodes = sourceEvidence?.reason_codes ?? [];
  const hasDeclaredLimitations = Boolean(
    sourceEvidence?.unsupported_economics.length || sourceEvidence?.degraded_economics.length,
  );
  const hasLimitationReason = SOURCE_LIMITATION_REASON_CODES.some((reasonCode) =>
    reasonCodes.includes(reasonCode),
  );
  const hasCallerSuppliedReason = reasonCodes.includes(
    "STATELESS_CALLER_SUPPLIED_SOURCE_ECONOMICS",
  );
  const hasSupportedDeclaredLimitations = hasReasonEvidenceForDeclaredLimitations(
    sourceEvidence?.unsupported_economics ?? [],
    sourceEvidence?.degraded_economics ?? [],
    reasonCodes,
  );

  switch (sourceStatus) {
    case "SOURCE_BACKED":
      return (
        !hasDeclaredLimitations &&
        !hasLimitationReason &&
        !hasCallerSuppliedReason &&
        reasonCodes.includes("LOTUS_CORE_ANALYTICS_INPUTS_USED") &&
        SOURCE_LINEAGE_REASON_CODES.some((reasonCode) => reasonCodes.includes(reasonCode))
      );
    case "SOURCE_LIMITED":
      return (
        hasDeclaredLimitations &&
        hasSupportedDeclaredLimitations &&
        !hasCallerSuppliedReason
      );
    case "CALLER_SUPPLIED":
      return hasCallerSuppliedReason;
    default:
      return false;
  }
}

function hasReasonEvidenceForDeclaredLimitations(
  unsupportedEconomics: string[],
  degradedEconomics: string[],
  reasonCodes: string[],
): boolean {
  const unsupportedEvidenceIsExplained =
    unsupportedEconomics.length === 0 ||
    reasonCodes.includes("COMPONENT_PNL_NOT_SOURCE_AUTHORED") ||
    reasonCodes.includes("MISSING_FX") ||
    reasonCodes.includes("MISSING_LOCAL_ECONOMICS");
  const degradedEvidenceIsExplained = degradedEconomics.every((degradedItem) => {
    const expectedReasonCode = DEGRADED_ECONOMICS_REASON_CODES[degradedItem];
    return expectedReasonCode !== undefined && reasonCodes.includes(expectedReasonCode);
  });

  return unsupportedEvidenceIsExplained && degradedEvidenceIsExplained;
}

function isSmoothingEvidenceConsistent(
  smoothingStatus: string,
  reasonCodes: string[] | undefined,
): boolean {
  const publishedReasonCodes = reasonCodes ?? [];

  switch (smoothingStatus) {
    case "APPLIED":
      return hasOnlyExpectedReasons(
        publishedReasonCodes,
        [
          "CARINO_FACTOR_APPLIED",
          "SMOOTHED_CONTRIBUTION_RECONCILES",
          ...COMMON_SMOOTHING_RESIDUAL_CODES,
        ],
        "CARINO_FACTOR_APPLIED",
      );
    case "NOT_REQUESTED":
      return hasOnlyExpectedReasons(
        publishedReasonCodes,
        ["SMOOTHING_NOT_REQUESTED", ...COMMON_SMOOTHING_RESIDUAL_CODES],
        "SMOOTHING_NOT_REQUESTED",
      );
    case "INVALID_DOMAIN_FALLBACK":
      return hasOnlyExpectedReasons(
        publishedReasonCodes,
        ["CARINO_INVALID_DAILY_LOG_DOMAIN", ...COMMON_SMOOTHING_RESIDUAL_CODES],
        "CARINO_INVALID_DAILY_LOG_DOMAIN",
      );
    case "NO_CONTRIBUTION_ROWS":
      return hasOnlyExpectedReasons(
        publishedReasonCodes,
        ["NO_CONTRIBUTION_ROWS"],
        "NO_CONTRIBUTION_ROWS",
      );
    default:
      return false;
  }
}

function hasOnlyExpectedReasons(
  publishedReasonCodes: string[],
  expectedReasonCodes: readonly string[],
  requiredReasonCode: string,
): boolean {
  return (
    publishedReasonCodes.includes(requiredReasonCode) &&
    publishedReasonCodes.every((reasonCode) => expectedReasonCodes.includes(reasonCode))
  );
}

function isPublishedContributionReconciled(
  contribution: ContributionSummaryView,
  smoothingStatus: string,
): boolean {
  if (smoothingStatus !== "APPLIED" && smoothingStatus !== "NOT_REQUESTED") {
    return true;
  }

  const smoothingEvidence = contribution.smoothing_evidence;
  const portfolioContribution = contribution.portfolio_contribution_pct;
  const portfolioReturn = contribution.total_portfolio_return_pct;
  const rawContribution = smoothingEvidence?.raw_contribution_pct;
  const finalContribution = smoothingEvidence?.final_contribution_pct;
  const linkedReturn = smoothingEvidence?.linked_return_pct;
  const smoothingResidual = smoothingEvidence?.smoothing_residual_pct;
  if (
    !isFiniteNumber(portfolioContribution) ||
    !isFiniteNumber(portfolioReturn) ||
    !isFiniteNumber(rawContribution) ||
    !isFiniteNumber(finalContribution) ||
    !isFiniteNumber(linkedReturn) ||
    !isFiniteNumber(smoothingResidual)
  ) {
    return false;
  }

  return (
    isWithinReconciliationTolerance(portfolioContribution, portfolioReturn) &&
    isWithinReconciliationTolerance(finalContribution, linkedReturn) &&
    isWithinReconciliationTolerance(finalContribution, portfolioContribution) &&
    isWithinReconciliationTolerance(smoothingResidual, 0)
  );
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isWithinReconciliationTolerance(left: number, right: number): boolean {
  return Math.abs(left - right) < CONTRIBUTION_RECONCILIATION_TOLERANCE_PCT;
}
