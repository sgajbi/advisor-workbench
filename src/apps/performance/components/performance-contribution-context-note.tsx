import type { ContributionSummaryView } from "@/features/workbench/types";

import {
  getContributionCoverageAssessment,
  getContributionReconciliationAssessment,
} from "./performance-workspace-view-helpers";

function formatContributionWeightingScheme(weightingScheme?: string | null) {
  switch (weightingScheme?.trim().toUpperCase()) {
    case "BOD":
      return "BOD weighting";
    case "EOD":
      return "EOD weighting";
    case "AVERAGE_WEIGHT":
      return "Average weight";
    default:
      return weightingScheme?.trim() || null;
  }
}

function formatContributionStatus(label: string, status?: string | null) {
  const normalized = status?.trim();
  return normalized ? `${label}: ${normalized}` : null;
}

export default function PerformanceContributionContextNote({
  contribution,
  className = "performance-contribution-context-note",
  showReconciliation = true,
}: {
  contribution: ContributionSummaryView;
  className?: string;
  showReconciliation?: boolean;
}) {
  const coverageText = [
    getContributionCoverageAssessment(contribution) ?? "Coverage unavailable",
    formatContributionWeightingScheme(contribution.weighting_scheme),
  ]
    .filter(Boolean)
    .join(" • ");
  const evidenceText = [
    formatContributionStatus("Source economics", contribution.source_economics_evidence?.status),
    formatContributionStatus("Smoothing", contribution.smoothing_evidence?.status),
  ]
    .filter(Boolean)
    .join(" • ");
  const sourceReasonText = contribution.source_economics_evidence?.reason_codes.length
    ? `Source reasons: ${contribution.source_economics_evidence.reason_codes.join(", ")}`
    : null;

  return (
    <div className={className} role="note">
      <strong>{coverageText}</strong>
      {evidenceText ? <span>{evidenceText}</span> : null}
      {sourceReasonText ? <span>{sourceReasonText}</span> : null}
      {showReconciliation ? (
        <span>
          {getContributionReconciliationAssessment(contribution) ??
            "Contribution-to-return reconciliation unavailable for this selection."}
        </span>
      ) : null}
    </div>
  );
}
