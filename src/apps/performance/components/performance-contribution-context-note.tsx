import type { ContributionSummaryView } from "@/features/workbench/types";

import {
  getContributionCoverageAssessment,
  getContributionReconciliationAssessment,
} from "./performance-workspace-view-helpers";

export default function PerformanceContributionContextNote({
  contribution,
  className = "performance-contribution-context-note",
}: {
  contribution: ContributionSummaryView;
  className?: string;
}) {
  return (
    <div className={className} role="note">
      <strong>
        {getContributionCoverageAssessment(contribution) ?? "Coverage unavailable"}
      </strong>
      <span>
        {getContributionReconciliationAssessment(contribution) ??
          "Contribution-to-return reconciliation unavailable for this selection."}
      </span>
    </div>
  );
}
