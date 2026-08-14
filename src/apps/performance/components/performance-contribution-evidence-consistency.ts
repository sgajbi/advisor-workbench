import type { ContributionSummaryView } from "@/features/workbench/types";

import {
  DEGRADED_ECONOMICS_VOCABULARY,
  UNSUPPORTED_ECONOMICS_VOCABULARY,
} from "./performance-contribution-evidence-vocabulary";

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

const COMMON_SMOOTHING_RESIDUAL_CODES = [
  "RAW_CONTRIBUTION_DIFFERS_FROM_LINKED_RETURN",
  "RESIDUAL_ALLOCATED_TO_RECONCILE_PERIOD",
] as const;

const CONTRIBUTION_RECONCILIATION_TOLERANCE_PCT = 0.005;

export type ContributionEvidenceInconsistency =
  | "numeric_reconciliation"
  | "status_or_reason";

export function getContributionEvidenceInconsistency(
  contribution: ContributionSummaryView,
  {
    sourceStatus,
    smoothingStatus,
  }: {
    sourceStatus: string;
    smoothingStatus: string;
  },
): ContributionEvidenceInconsistency | null {
  if (
    !isSourceEvidenceConsistent(contribution, sourceStatus) ||
    !isSmoothingEvidenceConsistent(
      contribution,
      smoothingStatus,
      contribution.smoothing_evidence?.reason_codes,
    )
  ) {
    return "status_or_reason";
  }
  return isPublishedContributionReconciled(contribution, smoothingStatus)
    ? null
    : "numeric_reconciliation";
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
  const expectedLimitationReasons = [
    ...unsupportedEconomics.map(
      (item) => UNSUPPORTED_ECONOMICS_VOCABULARY[item]?.reasonCode,
    ),
    ...degradedEconomics.map((item) => DEGRADED_ECONOMICS_VOCABULARY[item]?.reasonCode),
  ];
  if (
    expectedLimitationReasons.some((reasonCode) => reasonCode === undefined) ||
    expectedLimitationReasons.some((reasonCode) => !reasonCodes.includes(reasonCode))
  ) {
    return false;
  }

  const expectedReasonSet = new Set(
    expectedLimitationReasons.filter((reasonCode): reasonCode is string => reasonCode !== undefined),
  );
  return SOURCE_LIMITATION_REASON_CODES.every(
    (reasonCode) => !reasonCodes.includes(reasonCode) || expectedReasonSet.has(reasonCode),
  );
}

function isSmoothingEvidenceConsistent(
  contribution: ContributionSummaryView,
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
      return (
        hasOnlyExpectedReasons(
          publishedReasonCodes,
          ["NO_CONTRIBUTION_ROWS"],
          "NO_CONTRIBUTION_ROWS",
        ) &&
        contribution.position_rows.length === 0 &&
        contribution.levels.every((level) => level.rows.length === 0)
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
