"use client";

import { ActionButton, MetricRow, Text } from "@/design-system";
import DpmAiWorkflowResult from "@/features/workbench/components/dpm-ai-workflow-result";
import type { DpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";

type Props = {
  waveId: string | null;
  memoStatus: string;
  operationsStatus: string;
  pendingAction: string | null;
  outcome: DpmAiWorkflowOutcome | null;
  onRequestMemo: () => void;
  onRequestOperationsBrief: () => void;
};

export default function DpmWaveDecisionSupport({
  waveId,
  memoStatus,
  operationsStatus,
  pendingAction,
  outcome,
  onRequestMemo,
  onRequestOperationsBrief,
}: Props) {
  const unavailable = !waveId || Boolean(pendingAction);

  return (
    <section className="dpm-wave-decision-support" aria-labelledby="dpm-wave-decision-support-title">
      <div className="dpm-wave-decision-support-header">
        <div>
          <Text as="h3" variant="subsectionTitle" id="dpm-wave-decision-support-title">
            Decision support
          </Text>
          <Text variant="secondary">
            Prepare review-gated portfolio commentary or an internal operations brief from the
            selected rebalance evidence.
          </Text>
        </div>
        <div
          className="dpm-wave-decision-support-actions"
          aria-label="Rebalance decision support actions"
        >
          <ActionButton
            priority="secondary"
            disabled={unavailable}
            onClick={onRequestMemo}
            aria-label="Prepare rebalance PM memo"
          >
            {pendingAction === "Prepare PM memo" ? "Preparing PM memo" : "Prepare PM memo"}
          </ActionButton>
          <ActionButton
            priority="secondary"
            disabled={unavailable}
            onClick={onRequestOperationsBrief}
            aria-label="Prepare rebalance operations brief"
          >
            {pendingAction === "Prepare operations brief"
              ? "Preparing operations brief"
              : "Prepare operations brief"}
          </ActionButton>
        </div>
      </div>

      <div className="dpm-wave-decision-support-status">
        <MetricRow label="Portfolio memo" value={businessStateLabel(memoStatus)} />
        <MetricRow label="Operations brief" value={businessStateLabel(operationsStatus)} />
      </div>

      {outcome ? (
        <DpmAiWorkflowResult
          outcome={outcome}
          ariaLabel="Rebalance decision-support result"
          eyebrow="Rebalance decision support"
          focusOnMount
        />
      ) : null}
    </section>
  );
}
