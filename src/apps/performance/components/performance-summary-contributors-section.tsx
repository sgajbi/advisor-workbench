import {
  AnalyticsTable,
} from "@/design-system";

import PerformanceAnalyticalUnavailableState from "./performance-analytical-unavailable-state";
import PerformanceContributionAggregateTable from "./performance-contribution-aggregate-table";
import PerformanceContributionContextNote from "./performance-contribution-context-note";
import PerformanceContributorBarList from "./performance-contributor-bar-list";
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
          <div className="performance-contributors-compare-grid">
            <section className="performance-contributors-ranked-card">
              <PerformanceContributorBarList
                title="Top Contributors"
                ariaLabel="Top Contributors impact bars"
                items={presentation.positiveRankedItems}
                emptyBody="No positive position contributors are exposed for the selected period."
              />
            </section>
            <section className="performance-contributors-ranked-card">
              <PerformanceContributorBarList
                title="Top Detractors"
                ariaLabel="Top Detractors impact bars"
                items={presentation.negativeRankedItems}
                emptyBody="No detracting positions are exposed for the selected period."
              />
            </section>
          </div>
          <details className="performance-contributors-table-disclosure">
            <summary className="performance-contributors-table-disclosure-summary">
              <div className="performance-contributors-table-disclosure-copy">
                <strong>Instrument detail</strong>
                <span>Open the full instrument-level contribution breakdown in one ranked table.</span>
              </div>
            </summary>
            <AnalyticsTable
              ariaLabel="Contributor instrument detail table"
              className="performance-contributors-table performance-chart-observation-table"
              density="compact"
              variant="observation"
              columns={presentation.rankedTableModel.columns}
              rows={presentation.rankedTableModel.rows}
            />
          </details>
        </div>
      ) : presentation.mode === "partial" ? (
        <div className="performance-contributors-panel">
          <PerformanceAnalyticalUnavailableState
            ariaLabel="Contributor ranking partial state"
            status="partial"
            title={presentation.noticeTitle}
            body={presentation.noticeBody}
            hint={presentation.hint}
            contextItems={[
              { label: "Period", value: workspace.period },
              {
                label: "Benchmark",
                value: workspace.benchmark_code ?? "Not assigned",
              },
              {
                label: "Scope",
                value: workspace.contribution?.levels?.[0]?.name ?? "Aggregate contribution",
              },
            ]}
            availableItems={[
              {
                label: "Available now",
                value: "Aggregate contribution totals remain available below.",
              },
            ]}
          />
          {workspace.contribution?.levels?.length ? (
            <PerformanceContributionContextNote contribution={workspace.contribution} />
          ) : null}
          {workspace.contribution?.levels?.[0] ? (
            <PerformanceContributionAggregateTable
              contribution={workspace.contribution}
              level={workspace.contribution.levels[0]}
              ariaLabel="Aggregate contributor summary"
              className="performance-contributors-table performance-chart-observation-table"
            />
          ) : (
            <AnalyticsTable
              ariaLabel="Aggregate contributor summary"
              className="performance-contributors-table performance-chart-observation-table"
              density="compact"
              variant="observation"
              columns={presentation.tableModel.columns}
              rows={presentation.tableModel.rows}
              footer={presentation.tableModel.footer}
            />
          )}
        </div>
      ) : presentation.mode === "loading" ? (
        <p className="muted">{presentation.body}</p>
      ) : (
        <PerformanceAnalyticalUnavailableState
          ariaLabel="Contributor ranking unavailable state"
          status={capabilities.contributionRanking.state === "partial" ? "partial" : "unavailable"}
          title={presentation.noticeTitle}
          body={presentation.noticeBody}
          hint={presentation.hint}
          contextItems={[
            { label: "Period", value: workspace.period },
            {
              label: "Benchmark",
              value: workspace.benchmark_code ?? "Not assigned",
            },
            { label: "Scope", value: "Position-level contribution" },
          ]}
          availableItems={[
            {
              label: "Available now",
              value: "Return-path context remains available above this module.",
            },
          ]}
        />
      )}
    </PerformanceSummaryDriverModule>
  );
}
