import {
  AnalyticsTable,
  DisclosureToggleButton,
  SectionBlock,
  Text,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";

type RiskDrawdownPanelProps = {
  viewModel: PerformanceRiskViewModel;
  underwaterExpanded: boolean;
  onToggleUnderwater: () => void;
};

export default function RiskDrawdownPanel({
  viewModel,
  underwaterExpanded,
  onToggleUnderwater,
}: RiskDrawdownPanelProps) {
  return (
    <SectionBlock
      title="Drawdown"
      subtitle="Worst realized path loss, recovery posture, and drawdown episode evidence."
      className="performance-risk-panel performance-risk-drawdown-panel"
      actions={
        <DisclosureToggleButton
          expanded={underwaterExpanded}
          onToggle={onToggleUnderwater}
          expandedToggleLabel="Collapse underwater path"
          collapsedToggleLabel="Expand underwater path"
        />
      }
    >
      <WorkbenchSummaryMetricStrip
        ariaLabel="Risk drawdown headline metrics"
        className="performance-risk-metric-strip"
        items={viewModel.drawdownHeadlineMetrics.map((metric) => ({
          key: metric.key,
          label: metric.label,
          value: metric.value,
          support: metric.support,
          unavailable: metric.state === "unavailable",
        }))}
      />
      {viewModel.drawdownRelativeMetric ? (
        <div className="performance-risk-relative-note" aria-label="Relative drawdown summary">
          <Text variant="label">{viewModel.drawdownRelativeMetric.label}</Text>
          <Text variant="cardTitle">{viewModel.drawdownRelativeMetric.value}</Text>
          <Text variant="metadata">{viewModel.drawdownRelativeMetric.support}</Text>
        </div>
      ) : null}
      <AnalyticsTable
        ariaLabel="Risk drawdown episode table"
        variant="analysis"
        density="compact"
        columns={[
          { key: "episode", label: "Episode" },
          { key: "depth", label: "Depth", align: "right" },
          { key: "peak", label: "Peak" },
          { key: "trough", label: "Trough" },
          { key: "recovery", label: "Recovery" },
          { key: "days", label: "Days", align: "right" },
          { key: "status", label: "Status" },
        ]}
        rows={viewModel.drawdownEpisodes.map((episode) => ({
          key: episode.key,
          cells: [
            episode.episode,
            episode.depth,
            episode.peakDate,
            episode.troughDate,
            episode.recoveryDate,
            episode.totalDays,
            episode.status,
          ],
        }))}
        emptyState={{
          title: "No drawdown episodes",
          body: "Stateful drawdown episodes are not available for this portfolio context.",
        }}
      />
      {underwaterExpanded ? (
        <div className="performance-risk-underwater-detail" aria-label="Underwater path detail">
          {viewModel.underwaterDetailState === "loading" ? (
            <Text variant="metadata">Loading underwater path.</Text>
          ) : viewModel.underwaterDetailState === "unavailable" ? (
            <Text variant="metadata">
              Underwater path detail is not available for the selected portfolio context.
            </Text>
          ) : (
            <AnalyticsTable
              ariaLabel="Risk underwater series table"
              variant="analysis"
              density="compact"
              columns={[
                { key: "date", label: "Date" },
                { key: "drawdown", label: "Drawdown", align: "right" },
              ]}
              rows={viewModel.underwaterSeries.map((point) => ({
                key: point.key,
                cells: [point.date, point.drawdown],
              }))}
              emptyState={{
                title: "No underwater series",
                body: "Underwater detail has not been returned for this drawdown request.",
              }}
            />
          )}
        </div>
      ) : null}
    </SectionBlock>
  );
}
