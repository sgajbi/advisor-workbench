import { AnalyticsTable, ScreenStatePanel } from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskDetailDrawer from "./risk-detail-drawer";

export default function RiskDrawdownDetailDrawer({
  open,
  viewModel,
  onClose,
}: {
  open: boolean;
  viewModel: PerformanceRiskViewModel;
  onClose: () => void;
}) {
  const relativeMetric = viewModel.drawdownRelativeMetric;
  const episodeSummary = viewModel.drawdownEpisodeInterpretation;

  return (
    <RiskDetailDrawer
      open={open}
      title="Underwater path"
      subtitle="Realized drawdown path detail for the selected portfolio context."
      contextItems={[
        {
          label: "Max Drawdown",
          value: viewModel.drawdownHeadlineMetrics.find((metric) => metric.key === "max_drawdown")
            ?.value ?? "N/A",
        },
        {
          label: "Recovery",
          value: viewModel.drawdownHeadlineMetrics.find((metric) => metric.key === "recovery_status")
            ?.value ?? "N/A",
        },
        {
          label: "Relative Review",
          value: relativeMetric?.value ?? "N/A",
        },
      ]}
      summaryTitle={episodeSummary?.title ?? "Drawdown path review"}
      summaryBody={
        episodeSummary?.body ??
        "Underwater path detail is available for path review and recovery confirmation."
      }
      onClose={onClose}
    >
      {viewModel.underwaterDetailState === "loading" ? (
        <ScreenStatePanel
          kind="loading"
          title="Loading underwater path"
          body="Fetching drawdown path detail for the selected portfolio context."
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
            title: "No underwater path returned",
            body: "The current drawdown detail request did not return underwater path observations.",
          }}
        />
      )}
    </RiskDetailDrawer>
  );
}
