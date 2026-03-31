import {
  AnalyticsTable,
  WorkbenchRankedBarList,
  WorkbenchSummaryVisualCard,
} from "@/design-system";

import PerformanceCapabilityNotice from "./performance-capability-notice";
import PerformanceContributionAggregateTable from "./performance-contribution-aggregate-table";
import PerformanceContributionContextNote from "./performance-contribution-context-note";
import PerformanceContributionDetailStrip from "./performance-contribution-detail-strip";
import PerformanceSummaryDriverModule from "./performance-summary-driver-module";
import type { PerformanceSummaryContributorsSectionProps } from "./performance-workspace-types";
import { getPerformanceContributorsPresentation } from "./performance-summary-driver-helpers";

export default function PerformanceSummaryContributorsSection({
  workspace,
  capabilities,
  contributorScale,
  positivePositionContributors,
  negativePositionContributors,
  topContributors,
  bottomContributors,
  isDetailsPending,
}: PerformanceSummaryContributorsSectionProps) {
  const presentation = getPerformanceContributorsPresentation({
    workspace,
    capabilities,
    contributorScale,
    positivePositionContributors,
    negativePositionContributors,
    topContributors,
    bottomContributors,
    isDetailsPending,
  });

  return (
    <PerformanceSummaryDriverModule
      title={presentation.frame.title}
      subtitle={presentation.frame.subtitle}
    >
      {presentation.mode === "supported" ? (
        <div className="performance-contributors-panel">
          {workspace.contribution?.position_rows?.length ? (
            <PerformanceContributionDetailStrip
              contribution={workspace.contribution}
              ariaLabel="Contributor driver strip"
              className="performance-contributors-strip"
            />
          ) : null}
          {workspace.contribution?.levels?.length ? (
            <PerformanceContributionContextNote contribution={workspace.contribution} />
          ) : null}
          <div className="performance-contributors-grid">
            <WorkbenchSummaryVisualCard>
              <WorkbenchRankedBarList
                title="Top contributors"
                label="Contribution"
                scale={contributorScale}
                rows={presentation.positiveRows}
                emptyMessage="No positive contributors are present for the selected analytical slice."
              />
            </WorkbenchSummaryVisualCard>
            <WorkbenchSummaryVisualCard>
              <WorkbenchRankedBarList
                title="Top detractors"
                label="Contribution"
                scale={contributorScale}
                rows={presentation.negativeRows}
                emptyMessage="No detractors are present for the selected analytical slice."
              />
            </WorkbenchSummaryVisualCard>
          </div>
        </div>
      ) : presentation.mode === "partial" ? (
        <div className="performance-contributors-panel">
          <PerformanceCapabilityNotice
            capability={capabilities.contributionRanking}
            partialTitle={presentation.noticeTitle}
            unavailableTitle={presentation.noticeTitle}
            body={presentation.noticeBody}
            hint={presentation.hint}
          />
          {workspace.contribution?.levels?.length ? (
            <PerformanceContributionContextNote contribution={workspace.contribution} />
          ) : null}
          {workspace.contribution?.levels?.[0] ? (
            <PerformanceContributionAggregateTable
              contribution={workspace.contribution}
              level={workspace.contribution.levels[0]}
              ariaLabel="Aggregate contributor summary"
              className="performance-contributors-table"
            />
          ) : (
            <AnalyticsTable
              ariaLabel="Aggregate contributor summary"
              className="performance-contributors-table"
              dense
              columns={presentation.tableModel.columns}
              rows={presentation.tableModel.rows}
              footer={presentation.tableModel.footer}
            />
          )}
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
    </PerformanceSummaryDriverModule>
  );
}
