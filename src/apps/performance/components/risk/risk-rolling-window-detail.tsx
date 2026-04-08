import {
  Text,
  WorkbenchSegmentedControl,
  WorkbenchStatusRow,
} from "@/design-system";

import type { PerformanceRiskRollingWindow, PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskAnalyticalTable from "./risk-analytical-table";
import RiskDetailSection from "./risk-detail-section";
import { riskRollingPanelCopy } from "./risk-secondary-copy";
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
      title={riskRollingPanelCopy.detailTitle}
      ariaLabel="Rolling risk detail"
      density="compact"
      toolbar={
        viewModel.rollingWindows.length > 1 ? (
          <div className="performance-risk-rolling-window-selector">
            <div className="performance-risk-rolling-window-selector-copy">
              <Text variant="label">{riskRollingPanelCopy.reviewWindowLabel}</Text>
              <Text variant="metadata">{riskRollingPanelCopy.reviewWindowSupport}</Text>
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
      <RiskAnalyticalTable
        ariaLabel={riskRollingPanelCopy.detailTableAriaLabel}
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
        emptyState={riskRollingPanelCopy.detailTableEmptyState}
      />

      {viewModel.rollingSupportabilityNotes.length ? (
        <WorkbenchStatusRow
          label={riskRollingPanelCopy.supportabilityLabel}
          className="performance-risk-quality-flags performance-risk-rolling-supportability-row"
          items={viewModel.rollingSupportabilityNotes.map((note) => ({
            value: note.title,
            tone: note.tone === "warn" ? ("warn" as const) : ("default" as const),
          }))}
        />
      ) : null}
    </RiskDetailSection>
  );
}
