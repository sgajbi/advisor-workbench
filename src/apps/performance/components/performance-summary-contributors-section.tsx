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
import {
  getPerformanceContributorsPresentation,
  type PerformanceContributorRankedItem,
} from "./performance-summary-driver-helpers";

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
    const hasAsymmetricRanking = hasPositiveRankedItems !== hasNegativeRankedItems;
    const rankedContributorGroups = [
      {
        key: "contributors",
        title: "Top Contributors",
        ariaLabel: "Top Contributors impact bars",
        items: presentation.positiveRankedItems,
        emptyBody: presentation.positiveEmptyBody,
        hasItems: hasPositiveRankedItems,
      },
      {
        key: "detractors",
        title: "Top Detractors",
        ariaLabel: "Top Detractors impact bars",
        items: presentation.negativeRankedItems,
        emptyBody: presentation.negativeEmptyBody,
        hasItems: hasNegativeRankedItems,
      },
    ] as const;
    const primaryGroup = rankedContributorGroups.find((group) => group.hasItems) ?? rankedContributorGroups[0];
    const secondaryGroup =
      rankedContributorGroups.find((group) => group.key !== primaryGroup.key) ?? rankedContributorGroups[1];
    const instrumentDetailDisclosure = (
        <PerformanceModuleDisclosure
          className="performance-contributors-table-disclosure"
          summaryClassName="performance-contributors-table-disclosure-summary"
          titleClassName="performance-contributors-table-disclosure-title"
          title={presentation.detailDisclosureTitle}
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
    );

    content = hasAsymmetricRanking ? (
      <div className="performance-contributors-panel performance-contributors-panel-asymmetric">
        {renderRankedContributorCard(primaryGroup)}
        <div className="performance-contributors-asymmetric-side">
          {renderRankedContributorCard(secondaryGroup)}
        </div>
        {instrumentDetailDisclosure}
      </div>
    ) : (
      <div className="performance-contributors-panel">
        <div className="performance-contributors-compare-grid">
          {rankedContributorGroups.map((group) => renderRankedContributorCard(group))}
        </div>
        {instrumentDetailDisclosure}
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
        compact
        title={presentation.noticeTitle}
        body={presentation.noticeBody}
        contextItems={[]}
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

function renderRankedContributorCard(group: {
  key: string;
  title: string;
  ariaLabel: string;
  items: PerformanceContributorRankedItem[];
  emptyBody: string;
  hasItems: boolean;
}) {
  return (
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
  );
}
