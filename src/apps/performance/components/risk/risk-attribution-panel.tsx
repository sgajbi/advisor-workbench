import {
  AnalyticsTable,
  ScreenStatePanel,
  WorkbenchSegmentedControl,
  WorkbenchStatusRow,
} from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskDetailSection from "./risk-detail-section";
import RiskExecutiveSummary from "./risk-executive-summary";
import RiskHeadlineMetricGrid from "./risk-headline-metric-grid";
import RiskModuleShell from "./risk-module-shell";
import RiskPanelUtilityRow from "./risk-panel-utility-row";

type RiskAttributionPanelProps = {
  viewModel: PerformanceRiskViewModel;
  onSelectAttribution: (attributionType: string, groupingDimension: string) => void;
};

export default function RiskAttributionPanel({
  viewModel,
  onSelectAttribution,
}: RiskAttributionPanelProps) {
  const controls = viewModel.attributionControls;

  return (
    <RiskModuleShell
      title="Historical Risk Attribution"
      subtitle="Analytical decomposition of total and active risk across supported business dimensions."
      priority="secondary"
      className="performance-risk-attribution-panel"
      actions={
        <RiskPanelUtilityRow
          panelTitle="Historical Risk Attribution"
          methodologyRows={viewModel.attributionMethodologyRows}
        />
      }
      businessReading={
        viewModel.attributionExecutiveSummary ? (
          <RiskExecutiveSummary
            summary={viewModel.attributionExecutiveSummary}
            ariaLabel="Historical risk attribution business reading"
          />
        ) : null
      }
      headlineMetrics={
        viewModel.attributionHighlights.length ? (
          <RiskHeadlineMetricGrid
            ariaLabel="Risk attribution highlights"
            className="performance-risk-attribution-highlights"
            itemClassName="performance-risk-attribution-highlight-card"
            metrics={viewModel.attributionHighlights.map((highlight) => ({
              key: highlight.key,
              label: highlight.label,
              value: highlight.value,
              support: highlight.support,
            }))}
          />
        ) : null
      }
      detail={
        <RiskDetailSection
          title="Contributor review"
          ariaLabel="Risk attribution detail"
          toolbar={
            controls ? (
              <div className="performance-risk-attribution-toolbar">
                <WorkbenchSegmentedControl
                  value={controls.selectedAttributionType}
                  onChange={(nextValue) =>
                    onSelectAttribution(nextValue, controls.selectedGroupingDimension)
                  }
                  options={controls.attributionTypes.map((option) => ({
                    key: option.key,
                    label: option.label,
                    disabled: option.disabled,
                    title: option.reason ?? undefined,
                  }))}
                  ariaLabel="Risk attribution type"
                />
                <WorkbenchSegmentedControl
                  value={controls.selectedGroupingDimension}
                  onChange={(nextValue) =>
                    onSelectAttribution(controls.selectedAttributionType, nextValue)
                  }
                  options={controls.groupingDimensions.map((option) => ({
                    key: option.key,
                    label: option.label,
                    disabled: option.disabled,
                    title: option.reason ?? undefined,
                  }))}
                  ariaLabel="Risk attribution grouping"
                />
              </div>
            ) : null
          }
        >
          {viewModel.attributionTotals ? (
            <div className="performance-risk-note-card performance-risk-attribution-reconciliation">
              <div className="performance-risk-note-copy">
                <WorkbenchStatusRow
                  label="Attribution reconciliation"
                  items={[
                    {
                      value: `Total ${viewModel.attributionTotals.totalValue}`,
                      tone: "default" as const,
                    },
                    {
                      value: `Reconciled sum ${viewModel.attributionTotals.reconciledSum}`,
                      tone: "default" as const,
                    },
                    {
                      value: `Residual ${viewModel.attributionTotals.residual}`,
                      tone: "default" as const,
                    },
                  ]}
                />
              </div>
            </div>
          ) : null}

          {viewModel.attributionWarnings.length ? (
            <WorkbenchStatusRow
              label="Attribution notes"
              className="performance-risk-quality-flags"
              items={viewModel.attributionWarnings.map((warning) => ({
                value: warning,
                tone: "warn" as const,
              }))}
            />
          ) : null}

          {viewModel.attributionState === "loading" ? (
            <ScreenStatePanel
              kind="loading"
              title="Loading historical risk attribution"
              body="Fetching stateful attribution contributors for the selected controls."
              surface="analysis"
              rows={2}
            />
          ) : viewModel.attributionState === "blocked" ? (
            <ScreenStatePanel
              kind="partial"
              title="Attribution selection blocked"
              body="The selected attribution combination is blocked by the current stateful support matrix."
              hint="Choose a supported attribution type and grouping combination to continue."
              surface="analysis"
            />
          ) : viewModel.attributionState === "unavailable" ? (
            <ScreenStatePanel
              kind="unavailable"
              title="Historical risk attribution unavailable"
              body="Historical risk attribution is not available for the selected portfolio context."
              surface="analysis"
            />
          ) : (
            <AnalyticsTable
              ariaLabel="Historical risk attribution table"
              variant="analysis"
              density="compact"
              columns={[
                { key: "group", label: "Group" },
                { key: "avgWeight", label: "Average Weight", align: "right" },
                { key: "marginalContribution", label: "Marginal Sensitivity", align: "right" },
                { key: "componentContribution", label: "Component Contribution", align: "right" },
                { key: "contributionShare", label: "Share of Risk", align: "right" },
              ]}
              rows={viewModel.attributionRows.map((row) => ({
                key: row.key,
                cells: [
                  row.group,
                  row.avgWeight,
                  row.marginalContribution,
                  row.componentContribution,
                  row.contributionShare,
                ],
              }))}
              emptyState={{
                title: "No attribution contributors",
                body: "Historical risk attribution did not return contributor rows for the selected controls.",
              }}
            />
          )}
        </RiskDetailSection>
      }
    />
  );
}
