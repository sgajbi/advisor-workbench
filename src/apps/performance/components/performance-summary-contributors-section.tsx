import { AnalyticsModule, AnalyticsRankedList } from "@/design-system";

import { formatPct } from "../formatters";
import type { PerformanceSummaryContributorsSectionProps } from "./performance-workspace-types";

export default function PerformanceSummaryContributorsSection({
  workspace,
  hasContribution,
  hasPositionRanking,
  contributorScale,
  positivePositionContributors,
  negativePositionContributors,
  isDetailsPending,
}: PerformanceSummaryContributorsSectionProps) {
  return (
    <AnalyticsModule title="Top / Bottom Contributors" subtitle={`${workspace.period} position ranking`}>
      {hasContribution ? (
        hasPositionRanking ? (
          <div className="performance-contributors-grid">
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
          </div>
        ) : (
          <p className="muted">
            Position-level contributor ranking is not available from the current analytics
            contract.
          </p>
        )
      ) : isDetailsPending ? (
        <p className="muted">Loading contributor ranking for the selected analytical slice.</p>
      ) : (
        <p className="muted">Contributor ranking is not available for the current selection.</p>
      )}
    </AnalyticsModule>
  );
}
