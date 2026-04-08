import {
  AnalyticsTable,
  ScreenStatePanel,
  Text,
  WorkbenchSegmentedControl,
} from "@/design-system";

import type { PerformanceRiskRollingWindow, PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskDetailSection from "./risk-detail-section";

export default function RiskRollingWindowDetail({
  viewModel,
  selectedWindow,
  selectedWindowKey,
  onWindowChange,
  rollingExpanded,
}: {
  viewModel: PerformanceRiskViewModel;
  selectedWindow: PerformanceRiskRollingWindow | null;
  selectedWindowKey: string;
  onWindowChange: (value: string) => void;
  rollingExpanded: boolean;
}) {
  return (
    <RiskDetailSection
      title="Window detail"
      ariaLabel="Rolling risk detail"
      toolbar={
        viewModel.rollingWindows.length > 1 ? (
          <div className="performance-risk-rolling-window-selector">
            <div className="performance-risk-rolling-window-selector-copy">
              <Text variant="label">Review window</Text>
              <Text variant="metadata">Short to long horizon</Text>
            </div>
            <WorkbenchSegmentedControl
              value={selectedWindow?.key ?? selectedWindowKey}
              onChange={onWindowChange}
              options={viewModel.rollingWindows.map((window) => ({
                key: window.key,
                label: window.label,
                title: `${window.label} rolling window`,
              }))}
              ariaLabel="Rolling risk windows"
              className="performance-risk-window-toolbar performance-risk-rolling-window-toolbar"
              buttonClassName="performance-risk-rolling-window-button"
            />
          </div>
        ) : null
      }
    >
      {selectedWindow?.selectedWindowSummary ? (
        <div className="performance-risk-note-card performance-risk-rolling-window-review">
          <div className="performance-risk-note-copy">
            <Text variant="cardTitle">{selectedWindow.selectedWindowSummary.title}</Text>
            <Text variant="secondary">{selectedWindow.selectedWindowSummary.body}</Text>
            <Text variant="metadata" className="performance-risk-briefing-cue">
              Next: {selectedWindow.selectedWindowNextStep}
            </Text>
          </div>
        </div>
      ) : null}

      {viewModel.rollingSupportabilityNotes.length ? (
        <div
          className="performance-risk-supportability-list performance-risk-rolling-supportability-list"
          aria-label="Rolling review supportability notes"
        >
          {viewModel.rollingSupportabilityNotes.map((note) => (
            <div
              key={note.key}
              className={[
                "performance-risk-note-card",
                "performance-risk-rolling-supportability-note",
                note.tone === "warn" ? "performance-risk-rolling-supportability-note-warn" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="performance-risk-note-copy">
                <Text variant="cardTitle">{note.title}</Text>
                <Text variant="secondary">{note.body}</Text>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <AnalyticsTable
        ariaLabel="Rolling risk summary table"
        variant="analysis"
        density="compact"
        columns={[
          { key: "metric", label: "Measure" },
          { key: "current", label: "Current", align: "right" },
          { key: "typical", label: "Typical", align: "right" },
          { key: "range", label: "Observed Range", align: "right" },
          { key: "interpretation", label: "Interpretation" },
        ]}
        rows={(selectedWindow?.detailRowInterpretations ?? []).map((row) => ({
          key: row.key,
          cells: [row.metric, row.current, row.typical, row.range, row.interpretation],
        }))}
        emptyState={{
          title: "No rolling risk metrics",
          body: "Rolling risk windows are not available for this portfolio context.",
        }}
      />

      {rollingExpanded ? (
        <div className="performance-risk-rolling-detail" aria-label="Rolling series detail">
          {viewModel.rollingDetailState === "loading" ? (
            <ScreenStatePanel
              kind="loading"
              title="Loading rolling series"
              body="Fetching time-series risk detail for the selected rolling window."
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
            <AnalyticsTable
              ariaLabel="Rolling risk series table"
              variant="analysis"
              density="compact"
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
                title: "No rolling series",
                body: "Rolling series detail has not been returned for this window.",
              }}
            />
          )}
        </div>
      ) : null}
    </RiskDetailSection>
  );
}
