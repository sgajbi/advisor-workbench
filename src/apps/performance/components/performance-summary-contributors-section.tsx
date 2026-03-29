import {
  AnalyticsModule,
  AnalyticsRankedList,
  WorkbenchSummaryVisualCard,
} from "@/design-system";

import { formatPct } from "../formatters";
import PerformanceCapabilityNotice from "./performance-capability-notice";
import type { PerformanceSummaryContributorsSectionProps } from "./performance-workspace-types";

export default function PerformanceSummaryContributorsSection({
  workspace,
  capabilities,
  contributorScale,
  positivePositionContributors,
  negativePositionContributors,
  isDetailsPending,
}: PerformanceSummaryContributorsSectionProps) {
  const rankingState = capabilities.contributionRanking.state;

  return (
    <AnalyticsModule
      className="workbench-summary-card-compact workbench-summary-module-card performance-summary-module-card"
      compact
      title="Top / Bottom Contributors"
      subtitle={`${workspace.period} position ranking`}
    >
      {rankingState === "supported" ? (
          <div className="performance-contributors-grid">
            <WorkbenchSummaryVisualCard>
              <AnalyticsRankedList
                title="Highest"
                label="Contribution"
                scale={contributorScale}
                rows={positivePositionContributors.map((row) => ({
                  key: `top-position-${row.position_id}`,
                  title: row.position_id,
                  subtitle: `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
                  value: formatPct(row.contribution_pct),
                  magnitudePct: row.contribution_pct,
                  tone: "positive" as const,
                }))}
                emptyMessage="No positive contributors are present for the selected analytical slice."
              />
            </WorkbenchSummaryVisualCard>
            <WorkbenchSummaryVisualCard>
              <AnalyticsRankedList
                title="Lowest"
                label="Contribution"
                scale={contributorScale}
                rows={negativePositionContributors.map((row) => ({
                  key: `bottom-position-${row.position_id}`,
                  title: row.position_id,
                  subtitle: `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
                  value: formatPct(row.contribution_pct),
                  magnitudePct: row.contribution_pct,
                  tone: "negative" as const,
                }))}
                emptyMessage="No detractors are present for the selected analytical slice."
              />
            </WorkbenchSummaryVisualCard>
          </div>
      ) : isDetailsPending ? (
        <p className="muted">Loading contributor ranking for the selected analytical slice.</p>
      ) : (
        <PerformanceCapabilityNotice
          capability={capabilities.contributionRanking}
          partialTitle="Contributor ranking is partial"
          unavailableTitle="Contributor ranking unavailable"
          body={
            capabilities.contributionRanking.reason ??
            "Contributor ranking is not available for the current selection."
          }
          hint="Position-level contribution ranking needs source-backed contribution detail for the selected slice."
        />
      )}
    </AnalyticsModule>
  );
}
