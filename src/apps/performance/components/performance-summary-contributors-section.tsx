import {
  AnalyticsModule,
  AnalyticsRankedList,
  WorkbenchSummaryVisualCard,
} from "@/design-system";

import PerformanceCapabilityNotice from "./performance-capability-notice";
import type { PerformanceSummaryContributorsSectionProps } from "./performance-workspace-types";
import { getPerformanceContributorsPresentation } from "./performance-summary-driver-helpers";

export default function PerformanceSummaryContributorsSection({
  workspace,
  capabilities,
  contributorScale,
  positivePositionContributors,
  negativePositionContributors,
  isDetailsPending,
}: PerformanceSummaryContributorsSectionProps) {
  const presentation = getPerformanceContributorsPresentation({
    workspace,
    capabilities,
    contributorScale,
    positivePositionContributors,
    negativePositionContributors,
    isDetailsPending,
  });

  return (
    <AnalyticsModule
      className="workbench-summary-card-compact workbench-summary-module-card performance-summary-module-card"
      compact
      title={presentation.title}
      subtitle={presentation.subtitle}
    >
      {presentation.mode === "supported" ? (
          <div className="performance-contributors-grid">
            <WorkbenchSummaryVisualCard>
              <AnalyticsRankedList
                title="Top contributors"
                label="Contribution"
                scale={contributorScale}
                rows={presentation.positiveRows}
                emptyMessage="No positive contributors are present for the selected analytical slice."
              />
            </WorkbenchSummaryVisualCard>
            <WorkbenchSummaryVisualCard>
              <AnalyticsRankedList
                title="Top detractors"
                label="Contribution"
                scale={contributorScale}
                rows={presentation.negativeRows}
                emptyMessage="No detractors are present for the selected analytical slice."
              />
            </WorkbenchSummaryVisualCard>
          </div>
      ) : presentation.mode === "loading" ? (
        <p className="muted">{presentation.body}</p>
      ) : (
        <PerformanceCapabilityNotice
          capability={capabilities.contributionRanking}
          partialTitle={presentation.noticeTitle}
          unavailableTitle={presentation.noticeTitle}
          body={presentation.noticeBody}
          hint={presentation.hint}
        />
      )}
    </AnalyticsModule>
  );
}
