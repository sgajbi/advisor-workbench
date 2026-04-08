import {
  AnalyticsTable,
  DisclosureToggleButton,
  ScreenStatePanel,
  SectionBlock,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskContextList from "./risk-context-list";
import RiskExecutiveSummary from "./risk-executive-summary";

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
      subtitle="Realized loss path, recovery posture, and benchmark-relative drawdown evidence."
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
      {viewModel.drawdownExecutiveSummary ? (
        <RiskExecutiveSummary
          summary={viewModel.drawdownExecutiveSummary}
          ariaLabel="Drawdown business reading"
        />
      ) : null}
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
        <div className="performance-risk-note-card" aria-label="Relative drawdown summary">
          <div className="performance-risk-note-copy">
            <span className="ui-text ui-text-label">{viewModel.drawdownRelativeMetric.label}</span>
            <span className="ui-text ui-text-card-title">{viewModel.drawdownRelativeMetric.value}</span>
            <span className="ui-text ui-text-metadata">{viewModel.drawdownRelativeMetric.support}</span>
          </div>
        </div>
      ) : null}
      <RiskContextList rows={viewModel.drawdownContextRows} ariaLabel="Drawdown methodology context" compact />
      {viewModel.drawdownEpisodes.length ? (
        <AnalyticsTable
          ariaLabel="Risk drawdown episode table"
          variant="analysis"
          density="compact"
          columns={[
            { key: "episode", label: "Episode" },
            { key: "depth", label: "Current Reading", align: "right" },
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
      ) : (
        <ScreenStatePanel
          kind="empty"
          title="No drawdown episodes"
          body="No discrete drawdown intervals were returned for the selected portfolio window."
          surface="analysis"
        />
      )}
      {underwaterExpanded ? (
        <div className="performance-risk-underwater-detail" aria-label="Underwater path detail">
          {viewModel.underwaterDetailState === "loading" ? (
            <ScreenStatePanel
              kind="loading"
              title="Loading underwater path"
              body="Fetching drawdown series detail for the selected portfolio context."
              surface="analysis"
              rows={2}
            />
          ) : viewModel.underwaterDetailState === "unavailable" ? (
            <ScreenStatePanel
              kind="unavailable"
              title="Underwater path unavailable"
              body="Drawdown path detail is not available for the selected portfolio context."
              surface="analysis"
            />
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
