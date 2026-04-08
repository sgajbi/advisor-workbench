import {
  AnalyticsTable,
  ScreenStatePanel,
} from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskContextList from "./risk-context-list";
import RiskDetailSection from "./risk-detail-section";
import RiskExpandAction from "./risk-expand-action";
import RiskExecutiveSummary from "./risk-executive-summary";
import RiskHeadlineMetricGrid from "./risk-headline-metric-grid";
import RiskModuleShell from "./risk-module-shell";

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
    <RiskModuleShell
      title="Drawdown"
      subtitle="Realized loss path, recovery posture, and benchmark-relative drawdown evidence."
      className="performance-risk-drawdown-panel"
      actions={
        <RiskExpandAction
          expanded={underwaterExpanded}
          onToggle={onToggleUnderwater}
          expandedLabel="Collapse underwater path"
          collapsedLabel="Expand underwater path"
        />
      }
      businessReading={
        viewModel.drawdownExecutiveSummary ? (
          <RiskExecutiveSummary
            summary={viewModel.drawdownExecutiveSummary}
            ariaLabel="Drawdown business reading"
          />
        ) : null
      }
      headlineMetrics={
        <RiskHeadlineMetricGrid
          ariaLabel="Risk drawdown headline metrics"
          metrics={viewModel.drawdownHeadlineMetrics}
        />
      }
      detail={
        <RiskDetailSection title="Episode detail" ariaLabel="Risk drawdown detail">
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
        </RiskDetailSection>
      }
      context={
        <RiskContextList
          rows={viewModel.drawdownContextRows}
          ariaLabel="Drawdown methodology context"
          compact
          title="Context and methodology"
        />
      }
    />
  );
}
