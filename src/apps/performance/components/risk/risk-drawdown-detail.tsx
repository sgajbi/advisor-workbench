import { Text } from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskAnalyticalTable from "./risk-analytical-table";
import RiskDetailSection from "./risk-detail-section";

export default function RiskDrawdownDetail({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  const hasStructuredDetail =
    Boolean(viewModel.drawdownEpisodeInterpretation) || viewModel.drawdownEpisodes.length > 0;
  const fallbackDetail = resolveDrawdownFallbackDetail(viewModel);

  return (
    <div className="performance-risk-drawdown-detail-stack">
      <RiskDetailSection ariaLabel="Risk drawdown detail" density="compact">
        {viewModel.drawdownEpisodeInterpretation ? (
          <div className="performance-risk-note-card performance-risk-note-card-compact performance-risk-drawdown-interpretation-card performance-risk-drawdown-empty-note">
            <div className="performance-risk-note-copy">
              <Text variant="cardTitle">{viewModel.drawdownEpisodeInterpretation.title}</Text>
              <Text variant="secondary">{viewModel.drawdownEpisodeInterpretation.body}</Text>
            </div>
          </div>
        ) : null}

        {viewModel.drawdownEpisodes.length ? (
          <RiskAnalyticalTable
            ariaLabel="Risk drawdown episode table"
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
        ) : !hasStructuredDetail ? (
          <div className="performance-risk-note-card performance-risk-note-card-compact performance-risk-drawdown-interpretation-card performance-risk-drawdown-empty-note">
            <div className="performance-risk-note-copy">
              <Text variant="cardTitle">{fallbackDetail.title}</Text>
              <Text variant="secondary">{fallbackDetail.body}</Text>
            </div>
          </div>
        ) : null}
      </RiskDetailSection>
    </div>
  );
}

function resolveDrawdownFallbackDetail(viewModel: PerformanceRiskViewModel) {
  const failureDetail = viewModel.partialFailures[0];

  if (failureDetail) {
    return {
      title: "Drawdown review is partially available",
      body: `${failureDetail} Headline measures remain available, but episode review should be treated as incomplete.`,
    };
  }

  return {
    title: "Drawdown review is unavailable",
    body:
      "Drawdown episodes were not returned for the selected review window. Headline measures remain available, but episode review is not currently supported.",
  };
}
