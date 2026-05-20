"use client";

import DpmWaveSummaryCell from "@/features/workbench/components/dpm-wave-summary-cell";
import {
  dpmWaveBadgeTone,
  findDpmWaveMetricValue,
} from "@/features/workbench/dpm-wave-command-center-panel-helpers";
import type {
  DpmWaveMetricRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import {
  businessStateLabel,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  selectedWaveState: string;
  approvalBlocked: boolean;
  selectedWaveItemCount: string;
  metricRows: DpmWaveMetricRow[];
};

export default function DpmWaveReadinessSummaryStrip({
  selectedWaveState,
  approvalBlocked,
  selectedWaveItemCount,
  metricRows,
}: Props) {
  return (
    <div className="rebalance-summary-strip" aria-label="Rebalance readiness">
      <DpmWaveSummaryCell
        label="Rebalance Status"
        value={businessStateLabel(selectedWaveState)}
        tone={dpmWaveBadgeTone(selectedWaveState)}
      />
      <DpmWaveSummaryCell
        label="Approval Readiness"
        value={approvalBlocked ? "Blocked" : "Ready"}
        tone={approvalBlocked ? "danger" : "success"}
      />
      <DpmWaveSummaryCell label="Proposed Changes" value={selectedWaveItemCount} />
      <DpmWaveSummaryCell
        label="Drift Improvement"
        value={findDpmWaveMetricValue(
          metricRows,
          ["drift improvement", "drift reduction", "drift"],
          "Pending"
        )}
        tone="success"
      />
    </div>
  );
}
