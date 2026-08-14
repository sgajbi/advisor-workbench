import type { ContributionSummaryView } from "@/features/workbench/types";

import { formatPct } from "../formatters";
import { isContributionEvidenceConsistent } from "./performance-contribution-evidence-consistency";
import {
  getContributionCoverageAssessment,
  getContributionReconciliationAssessment,
} from "./performance-workspace-view-helpers";

export type ContributionEvidenceTone = "confirmed" | "limited" | "review";

export type ContributionEvidenceItem = {
  label: string;
  value: string;
};

export type ContributionEvidencePresentation = {
  tone: ContributionEvidenceTone;
  title: string;
  body: string;
  context: string;
  limitations: string[];
  evidenceItems: ContributionEvidenceItem[];
};

type ContributionCoveragePosture = "adequate" | "limited" | "unconfirmed";

const SOURCE_STATUSES = ["SOURCE_BACKED", "SOURCE_LIMITED", "CALLER_SUPPLIED"] as const;
const SMOOTHING_STATUSES = [
  "APPLIED",
  "NOT_REQUESTED",
  "INVALID_DOMAIN_FALLBACK",
  "NO_CONTRIBUTION_ROWS",
] as const;
const SOURCE_REASON_CODES = [
  "STATELESS_CALLER_SUPPLIED_SOURCE_ECONOMICS",
  "LOTUS_CORE_ANALYTICS_INPUTS_USED",
  "UPSTREAM_SNAPSHOT_LINEAGE_AVAILABLE",
  "UPSTREAM_SNAPSHOT_LINEAGE_AVAILABLE_VIA_EXECUTION_ONLY",
  "PERFORMANCE_COMPONENT_ECONOMICS_SOURCE_USED",
  "COMPONENT_PNL_NOT_SOURCE_AUTHORED",
  "PERFORMANCE_COMPONENT_ECONOMICS_UNAVAILABLE",
  "UNSUPPORTED_SOURCE_CASH_FLOW_TYPES_PRESENT",
  "UNCLASSIFIED_POSITION_ECONOMICS_PRESENT",
  "MISSING_FX",
  "MISSING_LOCAL_ECONOMICS",
] as const;
const SMOOTHING_REASON_CODES = [
  "CARINO_FACTOR_APPLIED",
  "SMOOTHING_NOT_REQUESTED",
  "CARINO_INVALID_DAILY_LOG_DOMAIN",
  "RAW_CONTRIBUTION_DIFFERS_FROM_LINKED_RETURN",
  "SMOOTHED_CONTRIBUTION_RECONCILES",
  "RESIDUAL_ALLOCATED_TO_RECONCILE_PERIOD",
  "NO_CONTRIBUTION_ROWS",
] as const;

const UNSUPPORTED_ECONOMICS_LABELS: Record<string, string> = {
  income_pnl: "income effects",
  fee_pnl: "fee effects",
  tax_pnl: "tax effects",
  price_pnl: "price effects",
  fx_pnl: "currency effects",
  realized_pnl: "realized gains and losses",
  realized_capital_pnl: "realized capital gains and losses",
  realized_fx_pnl: "realized currency gains and losses",
  corporate_action_pnl: "corporate-action effects",
  derivative_pnl: "derivative effects",
  cash_pnl: "cash effects",
  loan_pnl: "loan effects",
  liability_pnl: "liability effects",
  residual_pnl: "residual effects",
};

const DEGRADED_ECONOMICS_MESSAGES: Record<string, string> = {
  performance_component_economics_unavailable:
    "Component-level source economics are unavailable for this view.",
  unsupported_cash_flow_types: "Some source cash-flow types are not fully supported.",
  missing_classification: "Some holdings do not have a source-owned classification.",
};

export function getContributionEvidencePresentation(
  contribution: ContributionSummaryView,
): ContributionEvidencePresentation {
  const sourceEvidence = contribution.source_economics_evidence;
  const smoothingEvidence = contribution.smoothing_evidence;
  const sourceStatus = normalizeEvidenceValue(sourceEvidence?.status);
  const smoothingStatus = normalizeEvidenceValue(smoothingEvidence?.status);
  const hasIncompleteEvidence = sourceStatus === null || smoothingStatus === null;
  const unknownSourceCodes = getUnknownValues(sourceEvidence?.reason_codes, SOURCE_REASON_CODES);
  const unknownSmoothingCodes = getUnknownValues(
    smoothingEvidence?.reason_codes,
    SMOOTHING_REASON_CODES,
  );
  const hasUnknownStatus =
    (sourceStatus !== null && !includesEvidenceValue(SOURCE_STATUSES, sourceStatus)) ||
    (smoothingStatus !== null && !includesEvidenceValue(SMOOTHING_STATUSES, smoothingStatus));
  const hasUnknownEvidence =
    hasUnknownStatus || unknownSourceCodes.length > 0 || unknownSmoothingCodes.length > 0;
  const hasInconsistentEvidence =
    !hasIncompleteEvidence &&
    sourceStatus !== null &&
    smoothingStatus !== null &&
    !isContributionEvidenceConsistent(contribution, {
      sourceStatus,
      smoothingStatus,
    });
  const limitations = getContributionLimitations(contribution, {
    hasUnknownEvidence,
    hasInconsistentEvidence,
    smoothingStatus,
  });
  const decision = getContributionEvidenceDecision({
    hasSourceEvidence: sourceEvidence !== null && sourceEvidence !== undefined,
    hasIncompleteEvidence,
    sourceStatus,
    smoothingStatus,
    hasUnknownEvidence,
    hasInconsistentEvidence,
    coveragePosture: getContributionCoveragePosture(contribution.coverage_mv_pct),
    hasDeclaredSourceLimitations: Boolean(
      sourceEvidence?.unsupported_economics.length || sourceEvidence?.degraded_economics.length,
    ),
  });

  return {
    ...decision,
    context: buildContributionContext(contribution),
    limitations,
    evidenceItems: buildContributionEvidenceItems(contribution),
  };
}

function getContributionEvidenceDecision({
  hasSourceEvidence,
  hasIncompleteEvidence,
  sourceStatus,
  smoothingStatus,
  hasUnknownEvidence,
  hasInconsistentEvidence,
  coveragePosture,
  hasDeclaredSourceLimitations,
}: {
  hasSourceEvidence: boolean;
  hasIncompleteEvidence: boolean;
  sourceStatus: string | null;
  smoothingStatus: string | null;
  hasUnknownEvidence: boolean;
  hasInconsistentEvidence: boolean;
  coveragePosture: ContributionCoveragePosture;
  hasDeclaredSourceLimitations: boolean;
}): Pick<ContributionEvidencePresentation, "tone" | "title" | "body"> {
  if (!hasSourceEvidence) {
    return {
      tone: "review",
      title: "Contribution coverage cannot be confirmed",
      body: "Lotus did not receive source-economics evidence for this calculation. Review the calculation evidence before using the drivers in a client discussion.",
    };
  }
  if (hasIncompleteEvidence) {
    return {
      tone: "review",
      title: "Contribution calculation evidence is incomplete",
      body: "Lotus did not receive complete source and methodology statuses for this calculation. Review the published calculation evidence before using the driver explanation with a client.",
    };
  }
  if (hasUnknownEvidence) {
    return {
      tone: "review",
      title: "Contribution evidence needs review",
      body: "Lotus received a source or methodology status it does not yet recognize. Do not assume the figures are complete; review the exact calculation evidence before use.",
    };
  }
  if (hasInconsistentEvidence) {
    return {
      tone: "review",
      title: "Contribution evidence is inconsistent",
      body: "The published calculation status does not agree with its supporting evidence. Do not use the driver explanation with a client until the source evidence has been reviewed.",
    };
  }
  if (smoothingStatus === "INVALID_DOMAIN_FALLBACK") {
    return {
      tone: "limited",
      title: "Contribution evidence has a methodology limitation",
      body: "The standard multi-period smoothing method could not be applied for every day in the selected period. Review the methodology evidence before using the driver explanation with a client.",
    };
  }
  if (smoothingStatus === "NO_CONTRIBUTION_ROWS") {
    return {
      tone: "limited",
      title: "Contribution observations are unavailable",
      body: "No contribution rows were published for the selected period. The screen preserves the source posture but cannot support a driver explanation.",
    };
  }
  if (sourceStatus === "SOURCE_LIMITED") {
    return {
      tone: "limited",
      title: "Contribution coverage is limited",
      body: "The driver ranking uses the available source-owned portfolio economics, but not every component is source-authored. Review the stated exclusions before using the explanation with a client.",
    };
  }
  if (sourceStatus === "CALLER_SUPPLIED") {
    return {
      tone: "review",
      title: "Contribution input provenance needs confirmation",
      body: "These figures rely on request-supplied inputs rather than the standard source-owned portfolio record. Confirm the input provenance before client use.",
    };
  }
  if (sourceStatus === "SOURCE_BACKED" && coveragePosture === "unconfirmed") {
    return {
      tone: "review",
      title: "Contribution coverage cannot be confirmed",
      body: "A reliable market-value coverage percentage was not published for this calculation. Review the calculation evidence before using the driver explanation with a client.",
    };
  }
  if (sourceStatus === "SOURCE_BACKED" && coveragePosture === "limited") {
    return {
      tone: "limited",
      title: "Contribution market-value coverage is limited",
      body: "The source economics are confirmed, but the calculation covers less than 95% of portfolio market value. Treat the driver ranking as partial until broader coverage is available.",
    };
  }
  if (sourceStatus === "SOURCE_BACKED" && !hasDeclaredSourceLimitations) {
    return {
      tone: "confirmed",
      title: "Contribution coverage is confirmed",
      body: "The published driver view is supported by source-owned portfolio economics for the selected period. Use the displayed coverage and reconciliation when preparing the client explanation.",
    };
  }
  return {
    tone: "review",
    title: "Contribution coverage needs review",
    body: "The published source posture and its stated limitations do not fully align. Review the exact calculation evidence before use.",
  };
}

function getContributionCoveragePosture(
  coverageMvPct: number | null | undefined,
): ContributionCoveragePosture {
  if (
    typeof coverageMvPct !== "number" ||
    !Number.isFinite(coverageMvPct) ||
    coverageMvPct < 0 ||
    coverageMvPct > 100
  ) {
    return "unconfirmed";
  }
  return coverageMvPct >= 95 ? "adequate" : "limited";
}

function getContributionLimitations(
  contribution: ContributionSummaryView,
  {
    hasUnknownEvidence,
    hasInconsistentEvidence,
    smoothingStatus,
  }: {
    hasUnknownEvidence: boolean;
    hasInconsistentEvidence: boolean;
    smoothingStatus: string | null;
  },
): string[] {
  const sourceEvidence = contribution.source_economics_evidence;
  const limitations: string[] = [];
  const unsupportedEconomics = sourceEvidence?.unsupported_economics ?? [];
  const mappedUnsupported = unsupportedEconomics
    .map((item) => UNSUPPORTED_ECONOMICS_LABELS[item])
    .filter((item): item is string => Boolean(item));

  if (mappedUnsupported.length > 0) {
    limitations.push(`Not source-authored: ${formatBusinessList(mappedUnsupported)}.`);
  }
  if (mappedUnsupported.length < unsupportedEconomics.length) {
    limitations.push("Additional component economics are not source-authored.");
  }

  for (const degradedItem of sourceEvidence?.degraded_economics ?? []) {
    const message = DEGRADED_ECONOMICS_MESSAGES[degradedItem];
    if (message && !limitations.includes(message)) {
      limitations.push(message);
    }
  }
  if (
    (sourceEvidence?.degraded_economics.length ?? 0) >
    limitations.filter((item) => Object.values(DEGRADED_ECONOMICS_MESSAGES).includes(item)).length
  ) {
    limitations.push("Additional source economics are degraded.");
  }
  if (sourceEvidence?.reason_codes.includes("MISSING_FX")) {
    limitations.push("Currency source economics are incomplete.");
  }
  if (sourceEvidence?.reason_codes.includes("MISSING_LOCAL_ECONOMICS")) {
    limitations.push("Local-currency source economics are incomplete.");
  }
  if (smoothingStatus === "INVALID_DOMAIN_FALLBACK") {
    limitations.push("Multi-period smoothing used a source-confirmed fallback.");
  }
  if (hasUnknownEvidence) {
    limitations.push("Some published evidence is not recognized by this Workbench version.");
  }
  if (hasInconsistentEvidence) {
    limitations.push("Published statuses and supporting reason codes do not agree.");
  }

  return [...new Set(limitations)];
}

function buildContributionContext(contribution: ContributionSummaryView): string {
  const context = [
    contribution.coverage_mv_pct === null || contribution.coverage_mv_pct === undefined
      ? getContributionCoverageAssessment(contribution) ?? "Market-value coverage not published"
      : `${formatPct(contribution.coverage_mv_pct)} of market value covered`,
    formatContributionWeightingScheme(contribution.weighting_scheme),
    getContributionReconciliationAssessment(contribution) ?? "Reconciliation not published",
  ].filter((item): item is string => Boolean(item));

  return context.join(" • ");
}

function buildContributionEvidenceItems(
  contribution: ContributionSummaryView,
): ContributionEvidenceItem[] {
  const sourceEvidence = contribution.source_economics_evidence;
  const smoothingEvidence = contribution.smoothing_evidence;

  return [
    { label: "Source status", value: sourceEvidence?.status?.trim() || "Not published" },
    { label: "Source reason codes", value: formatEvidenceList(sourceEvidence?.reason_codes) },
    { label: "Source contracts", value: formatEvidenceList(sourceEvidence?.source_contracts) },
    { label: "Available economics", value: formatEvidenceList(sourceEvidence?.available_economics) },
    { label: "Unsupported economics", value: formatEvidenceList(sourceEvidence?.unsupported_economics) },
    { label: "Degraded economics", value: formatEvidenceList(sourceEvidence?.degraded_economics) },
    {
      label: "Source snapshots",
      value:
        sourceEvidence?.source_snapshot_count === null ||
        sourceEvidence?.source_snapshot_count === undefined
          ? "Not published"
          : String(sourceEvidence.source_snapshot_count),
    },
    {
      label: "Weighting basis",
      value: contribution.weighting_scheme?.trim() || "Not published",
    },
    { label: "Smoothing status", value: smoothingEvidence?.status?.trim() || "Not published" },
    { label: "Smoothing reason codes", value: formatEvidenceList(smoothingEvidence?.reason_codes) },
    {
      label: "Reconciliation",
      value:
        getContributionReconciliationAssessment(contribution) ??
        "Contribution-to-return reconciliation not published",
    },
  ];
}

function formatContributionWeightingScheme(weightingScheme?: string | null): string | null {
  switch (weightingScheme?.trim().toUpperCase()) {
    case "BOD":
      return "Beginning-of-day weight basis";
    case "EOD":
      return "End-of-day weight basis";
    case "AVERAGE_WEIGHT":
      return "Average-weight basis";
    default:
      return weightingScheme?.trim() ? "Weighting basis published in calculation evidence" : null;
  }
}

function getUnknownValues(
  values: string[] | undefined,
  knownValues: readonly string[],
): string[] {
  return (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && !includesEvidenceValue(knownValues, value));
}

function includesEvidenceValue(knownValues: readonly string[], value: string): boolean {
  return knownValues.includes(value);
}

function normalizeEvidenceValue(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

function formatEvidenceList(values: string[] | undefined): string {
  const publishedValues = (values ?? []).filter((value) => value.length > 0);
  return publishedValues.length > 0 ? publishedValues.join(", ") : "None published";
}

function formatBusinessList(values: string[]): string {
  if (values.length < 2) {
    return values[0] ?? "";
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}
