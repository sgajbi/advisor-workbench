"use client";

import { ActionButton, SemanticBadge } from "@/design-system";
import type { DpmWaveMetricTile } from "@/features/workbench/dpm-wave-command-center-panel-helpers";
import {
  DPM_WAVE_LIFECYCLE_STEPS,
  dpmWaveBadgeTone,
} from "@/features/workbench/dpm-wave-command-center-panel-helpers";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";

type Props = {
  selectedWaveId: string | null;
  selectedWaveState: string;
  lifecycleIndex: number;
  approvalBlocked: boolean;
  stagingBlocked: boolean;
  handoffBlocked: boolean;
  metricTiles: DpmWaveMetricTile[];
  pendingAction: string | null;
  actionMessage: string | null;
  onPreview: () => void;
  onCreate: () => void;
  onReviewData: () => void;
  onSimulate: () => void;
  onRequestApproval: () => void;
  onStage: () => void;
  onPrepareHandoff: () => void;
  onOpenEvidencePack: () => void;
};

export default function DpmWaveActiveRebalanceSection({
  selectedWaveId,
  selectedWaveState,
  lifecycleIndex,
  approvalBlocked,
  stagingBlocked,
  handoffBlocked,
  metricTiles,
  pendingAction,
  actionMessage,
  onPreview,
  onCreate,
  onReviewData,
  onSimulate,
  onRequestApproval,
  onStage,
  onPrepareHandoff,
  onOpenEvidencePack,
}: Props) {
  const hasPendingAction = Boolean(pendingAction);

  return (
    <section className="rebalance-active-card" aria-labelledby="rebalance-active-title">
      <div className="rebalance-section-heading">
        <h3 id="rebalance-active-title">Active Rebalance</h3>
        <SemanticBadge tone={dpmWaveBadgeTone(selectedWaveState)}>
          {businessStateLabel(selectedWaveState)}
        </SemanticBadge>
      </div>

      <div className="rebalance-stepper" aria-label="Rebalance lifecycle">
        {DPM_WAVE_LIFECYCLE_STEPS.map((step, index) => (
          <div
            className={[
              "rebalance-step",
              index < lifecycleIndex ? "is-complete" : "",
              index === lifecycleIndex ? "is-active" : "",
              index > lifecycleIndex ? "is-pending" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={step}
          >
            <span aria-hidden="true" />
            <strong>{step}</strong>
          </div>
        ))}
      </div>

      {approvalBlocked ? (
        <div className="rebalance-alert" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">
            warning
          </span>
          <span>Resolve mandate attention items before approval.</span>
        </div>
      ) : (
        <div className="rebalance-ready-note" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">
            check_circle
          </span>
          <span>Approval can proceed after advisor review.</span>
        </div>
      )}

      <div className="rebalance-metric-grid" aria-label="Rebalance metrics">
        {metricTiles.map((metric) => (
          <MetricTileView key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="rebalance-command-row" aria-label="Rebalance workflow actions">
        <ActionButton priority="secondary" onClick={onPreview} disabled={hasPendingAction}>
          Preview
        </ActionButton>
        <ActionButton priority="secondary" onClick={onCreate} disabled={hasPendingAction}>
          Create Rebalance
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={onReviewData}
          disabled={!selectedWaveId || hasPendingAction}
        >
          Review Data
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={onSimulate}
          disabled={!selectedWaveId || hasPendingAction}
        >
          Simulate
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={onRequestApproval}
          disabled={!selectedWaveId || hasPendingAction || approvalBlocked}
        >
          Request Approval
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={onStage}
          disabled={!selectedWaveId || hasPendingAction || stagingBlocked}
        >
          Stage
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={onPrepareHandoff}
          disabled={!selectedWaveId || hasPendingAction || handoffBlocked}
        >
          Prepare Handoff
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={onOpenEvidencePack}
          disabled={!selectedWaveId || hasPendingAction}
        >
          Open Evidence Pack
        </ActionButton>
      </div>

      {actionMessage ? <p className="rebalance-action-message">{actionMessage}</p> : null}
    </section>
  );
}

function MetricTileView({ metric }: { metric: DpmWaveMetricTile }) {
  return (
    <div className={`rebalance-metric-tile rebalance-metric-${metric.tone ?? "default"}`}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
    </div>
  );
}
