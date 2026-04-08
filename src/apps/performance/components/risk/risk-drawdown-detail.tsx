import { AnalyticsTable, ScreenStatePanel, Text } from "@/design-system";

import type { PerformanceRiskMetricCard, PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskDetailSection from "./risk-detail-section";

export default function RiskDrawdownDetail({
  viewModel,
  underwaterExpanded,
}: {
  viewModel: PerformanceRiskViewModel;
  underwaterExpanded: boolean;
}) {
  return (
    <div className="performance-risk-drawdown-detail-stack">
      {viewModel.drawdownSupportingMetrics.length ? (
        <RiskDetailSection
          title="Supporting risk measures"
          ariaLabel="Drawdown supporting risk measures"
          className="performance-risk-supporting-detail"
        >
          <div
            className="performance-risk-secondary-metrics performance-risk-drawdown-supporting-strip"
            aria-label="Drawdown supporting measures"
          >
            {viewModel.drawdownSupportingMetrics.map((metric) => (
              <SupportingMetricCard key={metric.key} metric={metric} />
            ))}
          </div>
        </RiskDetailSection>
      ) : null}

      <RiskDetailSection title="Episode review" ariaLabel="Risk drawdown detail">
        {viewModel.drawdownEpisodeInterpretation ? (
          <div className="performance-risk-note-card performance-risk-drawdown-interpretation-card">
            <div className="performance-risk-note-copy">
              <Text variant="cardTitle">{viewModel.drawdownEpisodeInterpretation.title}</Text>
              <Text variant="secondary">{viewModel.drawdownEpisodeInterpretation.body}</Text>
            </div>
          </div>
        ) : null}

        {viewModel.drawdownEpisodes.length ? (
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
              body: "No retained drawdown episodes are available for the selected review window.",
            }}
          />
        ) : null}

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
      </RiskDetailSection>
    </div>
  );
}

function SupportingMetricCard({
  metric,
}: {
  metric: PerformanceRiskMetricCard;
}) {
  return (
    <div className="performance-risk-secondary-metric">
      <div className="performance-risk-secondary-metric-copy">
        <Text variant="label">{metric.label}</Text>
        <Text variant="metadata">{metric.support}</Text>
      </div>
      <Text variant="cardTitle" className="performance-risk-secondary-metric-value">
        {metric.value}
      </Text>
    </div>
  );
}
