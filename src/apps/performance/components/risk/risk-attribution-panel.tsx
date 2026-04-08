import {
  AnalyticsTable,
  ScreenStatePanel,
  WorkbenchSegmentedControl,
  WorkbenchStatusRow,
} from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskContextList from "./risk-context-list";
import RiskDetailSection from "./risk-detail-section";
import RiskExecutiveSummary from "./risk-executive-summary";
import RiskHeadlineMetricGrid from "./risk-headline-metric-grid";
import RiskModuleShell from "./risk-module-shell";

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
      subtitle="Stateful decomposition of total and active risk across supported business dimensions."
      className="performance-risk-attribution-panel"
      businessReading={
        viewModel.attributionExecutiveSummary ? (
          <RiskExecutiveSummary
            summary={viewModel.attributionExecutiveSummary}
            ariaLabel="Historical risk attribution business reading"
          />
        ) : null
      }
      headlineMetrics={
        viewModel.attributionTotals ? (
          <RiskHeadlineMetricGrid
            ariaLabel="Risk attribution totals"
            metrics={[
              {
                key: "metric",
                label: "Selection",
                value: viewModel.attributionTotals.metric,
                support: viewModel.attributionTotals.support,
              },
              {
                key: "total",
                label: "Total",
                value: viewModel.attributionTotals.totalValue,
                support: "Reported total metric",
              },
              {
                key: "sum",
                label: "Reconciled Sum",
                value: viewModel.attributionTotals.reconciledSum,
                support: "Sum of contributors",
              },
              {
                key: "residual",
                label: "Residual",
                value: viewModel.attributionTotals.residual,
                support: "Residual after reconciliation",
              },
            ]}
          />
        ) : null
      }
      detail={
        <RiskDetailSection
          title="Contributor detail"
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
                { key: "componentContribution", label: "Component Effect", align: "right" },
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
      context={
        <RiskContextList
          rows={viewModel.attributionMethodologyRows}
          ariaLabel="Historical risk attribution methodology"
          compact
          title="Context and methodology"
        />
      }
    />
  );
}
