import { ScreenStatePanel } from "@/design-system";

import type { PerformanceRiskRollingWindow, PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskAnalyticalTable from "./risk-analytical-table";
import RiskDetailDrawer from "./risk-detail-drawer";

export default function RiskRollingDetailDrawer({
  open,
  viewModel,
  selectedWindow,
  onClose,
}: {
  open: boolean;
  viewModel: PerformanceRiskViewModel;
  selectedWindow: PerformanceRiskRollingWindow | null;
  onClose: () => void;
}) {
  const summary = selectedWindow?.selectedWindowSummary;

  return (
    <RiskDetailDrawer
      open={open}
      title="Rolling series"
      subtitle="Selected-window rolling detail for the current short-to-long horizon review."
      contextItems={[
        {
          label: "Review window",
          value: selectedWindow?.label ?? "N/A",
        },
        {
          label: "Horizon",
          value: selectedWindow?.horizonLabel ?? "N/A",
        },
        {
          label: "Evidence",
          value:
            viewModel.rollingSupportabilityNotes.length > 0 ? "Qualified" : "Ready",
        },
      ]}
      summaryTitle={summary?.title ?? "Rolling window review"}
      summaryBody={
        summary?.body ??
        "Rolling series detail is available for selected-window review."
      }
      notes={viewModel.rollingSupportabilityNotes}
      onClose={onClose}
    >
      {viewModel.rollingDetailState === "loading" ? (
        <ScreenStatePanel
          kind="loading"
          title="Loading rolling series"
          body="Fetching time-series rolling detail for the selected window."
          surface="analysis"
          rows={2}
        />
      ) : viewModel.rollingDetailState === "unavailable" ? (
        <ScreenStatePanel
          kind="unavailable"
          title="Rolling series unavailable"
          body="Time-series rolling detail is not available for the selected portfolio context."
          surface="analysis"
        />
      ) : (
        <RiskAnalyticalTable
          ariaLabel="Rolling risk series table"
          columns={[
            { key: "date", label: "Date" },
            ...((selectedWindow?.seriesMetricKeys ?? []).map((metricKey) => ({
              key: metricKey,
              label:
                selectedWindow?.detailRowInterpretations.find((row) => row.key.endsWith(metricKey))
                  ?.metric ?? metricKey,
              align: "right" as const,
            })) ?? []),
          ]}
          rows={(selectedWindow?.seriesRows ?? []).map((row) => ({
            key: row.key,
            cells: [
              row.date,
              ...(selectedWindow?.seriesMetricKeys.map(
                (metricKey) => row.values[metricKey] ?? "N/A"
              ) ?? []),
            ],
          }))}
          emptyState={{
            title: "No rolling series returned",
            body: "The current rolling detail request did not return time-series points for this window.",
          }}
        />
      )}
    </RiskDetailDrawer>
  );
}
