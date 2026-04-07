import {
  AnalyticsTable,
  SectionBlock,
  Text,
  WorkbenchSegmentedControl,
  WorkbenchStatusRow,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";

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
    <SectionBlock
      title="Historical Risk Attribution"
      subtitle="Stateful decomposition of realized total and active risk across supported business dimensions."
      className="performance-risk-panel performance-risk-attribution-panel"
    >
      {controls ? (
        <div className="performance-risk-attribution-toolbar">
          <WorkbenchSegmentedControl
            value={controls.selectedAttributionType}
            onChange={(nextValue) => onSelectAttribution(nextValue, controls.selectedGroupingDimension)}
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
            onChange={(nextValue) => onSelectAttribution(controls.selectedAttributionType, nextValue)}
            options={controls.groupingDimensions.map((option) => ({
              key: option.key,
              label: option.label,
              disabled: option.disabled,
              title: option.reason ?? undefined,
            }))}
            ariaLabel="Risk attribution grouping"
          />
        </div>
      ) : null}

      {viewModel.attributionTotals ? (
        <WorkbenchSummaryMetricStrip
          ariaLabel="Risk attribution totals"
          className="performance-risk-metric-strip"
          items={[
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
        <Text variant="metadata">Loading historical risk attribution.</Text>
      ) : viewModel.attributionState === "blocked" ? (
        <Text variant="metadata">
          The selected attribution combination is blocked by the current stateful support matrix.
        </Text>
      ) : viewModel.attributionState === "unavailable" ? (
        <Text variant="metadata">
          Historical risk attribution is not available for the selected portfolio context.
        </Text>
      ) : (
        <AnalyticsTable
          ariaLabel="Historical risk attribution table"
          variant="analysis"
          density="compact"
          columns={[
            { key: "group", label: "Group" },
            { key: "avgWeight", label: "Avg Weight", align: "right" },
            { key: "marginalContribution", label: "Marginal", align: "right" },
            { key: "componentContribution", label: "Component", align: "right" },
            { key: "contributionShare", label: "Share", align: "right" },
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
    </SectionBlock>
  );
}
