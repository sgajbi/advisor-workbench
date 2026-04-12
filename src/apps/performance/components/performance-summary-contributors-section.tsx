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
            <section className="performance-contributors-table-card">
              <PerformanceContributorBarList
                title="Top Contributors"
                ariaLabel="Top Contributors impact bars"
                items={presentation.positiveRankedItems}
              />
              <AnalyticsTable
                ariaLabel="Top Contributors table"
                className="performance-contributors-table performance-chart-observation-table"
                density="compact"
                variant="observation"
                columns={presentation.positiveTableModel.columns}
                rows={presentation.positiveTableModel.rows}
              />
            </section>
            <section className="performance-contributors-table-card">
              <PerformanceContributorBarList
                title="Top Detractors"
                ariaLabel="Top Detractors impact bars"
                items={presentation.negativeRankedItems}
              />
              <AnalyticsTable
                ariaLabel="Top Detractors table"
                className="performance-contributors-table performance-chart-observation-table"
                density="compact"
                variant="observation"
                columns={presentation.negativeTableModel.columns}
                rows={presentation.negativeTableModel.rows}
              />
            </section>
          </div>
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
                label: "Ranking scope",
                value: workspace.contribution?.levels?.[0]?.name ?? "Aggregate contribution",
              },
              { label: "Detail posture", value: "Position-level ranking not exposed" },
            ]}
            availableItems={[
              {
                label: "Aggregate evidence",
                value: "Contribution totals remain available below for the current selection.",
              },
              {
                label: "Supportability",
                value: "Position-level contributors require source-backed contribution detail.",
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
            { label: "Ranking scope", value: "Position-level contribution" },
            { label: "Coverage", value: "Contribution detail not exposed" },
          ]}
          availableItems={[
            {
              label: "Executive context",
              value: "Return-path benchmark posture and summary metrics remain available above.",
            },
            {
              label: "Dependency",
              value: "Position-level ranking requires source-backed contribution detail.",
            },
          ]}
        />
      )}
    </PerformanceSummaryDriverModule>
  );
}
