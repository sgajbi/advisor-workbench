import {
  Text,
  WorkbenchSegmentedControl,
} from "@/design-system";

import type { PerformanceRiskRollingWindow, PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskAnalyticalTable from "./risk-analytical-table";
import RiskDetailSection from "./risk-detail-section";
import RiskTableText from "./risk-table-text";

export default function RiskRollingWindowDetail({
  viewModel,
  selectedWindow,
  selectedWindowKey,
  onWindowChange,
}: {
  viewModel: PerformanceRiskViewModel;
  selectedWindow: PerformanceRiskRollingWindow | null;
  selectedWindowKey: string;
  onWindowChange: (value: string) => void;
}) {
  return (
    <RiskDetailSection
      title="Window detail"
      ariaLabel="Rolling risk detail"
      density="compact"
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
              className="performance-risk-window-toolbar performance-risk-rolling-window-toolbar performance-risk-compact-segmented-control"
              buttonClassName="performance-risk-rolling-window-button performance-risk-compact-segmented-control-button"
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

      <RiskAnalyticalTable
        ariaLabel="Rolling risk summary table"
        density="compact"
        className="performance-risk-rolling-detail-table"
        columns={[
          { key: "metric", label: "Measure" },
          { key: "current", label: "Current", align: "right" },
          { key: "typical", label: "Typical", align: "right" },
          { key: "range", label: "Range", align: "right" },
          { key: "interpretation", label: "Review note" },
        ]}
        rows={(selectedWindow?.detailRowInterpretations ?? []).map((row) => ({
          key: row.key,
          cells: [
            <RiskTableText key={`${row.key}-metric`} value={row.metric} />,
            row.current,
            row.typical,
            row.range,
            <RiskTableText
              key={`${row.key}-interpretation`}
              value={row.interpretation}
              clamp
            />,
          ],
        }))}
        emptyState={{
          title: "No rolling risk metrics",
          body: "Rolling risk windows are not available for this portfolio context.",
        }}
      />
    </RiskDetailSection>
  );
}
