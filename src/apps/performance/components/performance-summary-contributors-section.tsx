import {
  AnalyticsTable,
  WorkbenchLoadingState,
} from "@/design-system";

import PerformanceAnalyticalUnavailableState from "./performance-analytical-unavailable-state";
import PerformanceContributionAggregateTable from "./performance-contribution-aggregate-table";
import PerformanceContributionContextNote from "./performance-contribution-context-note";
import PerformanceContributorBarList from "./performance-contributor-bar-list";
import PerformanceModuleDisclosure from "./performance-module-disclosure";
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
  let content: React.ReactNode;

  if (presentation.mode === "supported") {
    const hasPositiveRankedItems = presentation.positiveRankedItems.length > 0;
    const hasNegativeRankedItems = presentation.negativeRankedItems.length > 0;
    const rankedContributorGroups = [
      {
        key: "contributors",
        title: "Top Contributors",
        ariaLabel: "Top Contributors impact bars",
        items: presentation.positiveRankedItems,
        emptyBody: "No positive position contributors are exposed for the selected period.",
        hasItems: hasPositiveRankedItems,
      },
      {
        key: "detractors",
        title: "Top Detractors",
        ariaLabel: "Top Detractors impact bars",
        items: presentation.negativeRankedItems,
        emptyBody: "No detracting positions are exposed for the selected period.",
        hasItems: hasNegativeRankedItems,
      },
    ] as const;

    content = (
      <div className="performance-contributors-panel">
        <div
          className={[
            "performance-contributors-compare-grid",
            hasPositiveRankedItems && !hasNegativeRankedItems
              ? "performance-contributors-compare-grid-right-empty"
              : "",
            hasNegativeRankedItems && !hasPositiveRankedItems
              ? "performance-contributors-compare-grid-left-empty"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {rankedContributorGroups.map((group) => (
            <section
              key={group.key}
              className={[
                "performance-contributors-ranked-card",
                group.hasItems
                  ? "performance-contributors-ranked-card-populated"
                  : "performance-contributors-ranked-card-empty",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <PerformanceContributorBarList
                title={group.title}
                ariaLabel={group.ariaLabel}
                items={group.items}
                emptyBody={group.emptyBody}
              />
            </section>
          ))}
        </div>
        <PerformanceModuleDisclosure
          className="performance-contributors-table-disclosure"
          summaryClassName="performance-contributors-table-disclosure-summary"
          titleClassName="performance-contributors-table-disclosure-title"
          title="Instrument detail"
        >
          <AnalyticsTable
            ariaLabel="Contributor instrument detail table"
            className="performance-contributors-table performance-chart-observation-table"
            density="compact"
            variant="observation"
            columns={presentation.rankedTableModel.columns}
            rows={presentation.rankedTableModel.rows}
          />
        </PerformanceModuleDisclosure>
      </div>
    );
  } else if (presentation.mode === "partial") {
    content = (
      <div className="performance-contributors-panel">
        <PerformanceAnalyticalUnavailableState
          ariaLabel="Contributor ranking partial state"
          status="partial"
          kicker={null}
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
    );
  } else if (presentation.mode === "loading") {
    content = (
      <WorkbenchLoadingState
        className="performance-contributors-loading-state"
        title="Loading performance drivers"
        message={presentation.body}
        rows={4}
      />
    );
  } else {
    content = (
      <PerformanceAnalyticalUnavailableState
        ariaLabel="Contributor ranking unavailable state"
        status={capabilities.contributionRanking.state === "partial" ? "partial" : "unavailable"}
        kicker={null}
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
    );
  }

  return (
    <PerformanceSummaryDriverModule
      title={presentation.frame.title}
      subtitle={presentation.frame.subtitle}
    >
      {content}
    </PerformanceSummaryDriverModule>
  );
}
