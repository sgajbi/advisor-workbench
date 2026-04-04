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

  return (
    <div className={className} role="note">
      <strong>{coverageText}</strong>
      {showReconciliation ? (
        <span>
          {getContributionReconciliationAssessment(contribution) ??
            "Contribution-to-return reconciliation unavailable for this selection."}
        </span>
      ) : null}
    </div>
  );
}
