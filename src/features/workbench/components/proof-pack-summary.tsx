"use client";

import { ActionButton, MetricRow, ScreenStatePanel, Text } from "@/design-system";
import { ProofPackStateBadge } from "@/features/workbench/components/proof-pack-badges";
import type { ProofPackPanelModel, ProofPackPanelState } from "@/features/workbench/proof-pack-view-model";
import {
  proofPackStatePanelCopy,
  shouldShowProofPackStatePanel,
} from "@/features/workbench/proof-pack-panel-helpers";

type ProofPackSummaryProps = {
  model: ProofPackPanelModel;
  portfolioId: string;
  proofPackId: string | null;
  rebalanceRunId: string | null;
  pendingAction: string | null;
  actionError: string | null;
  handoffStatus: string | null;
  errorMessage?: string | null;
  onGenerateProofPack: () => void;
  onLoadProofPack: () => void;
  onLoadMarkdown: () => void;
  onLoadReportInput: () => void;
  onRequestAiPmMemo: () => void;
};

export default function ProofPackSummary({
  model,
  portfolioId,
  proofPackId,
  rebalanceRunId,
  pendingAction,
  actionError,
  handoffStatus,
  errorMessage,
  onGenerateProofPack,
  onLoadProofPack,
  onLoadMarkdown,
  onLoadReportInput,
  onRequestAiPmMemo,
}: ProofPackSummaryProps) {
  const stateCopy = proofPackStatePanelCopy(model.state as ProofPackPanelState, portfolioId);
  const showStatePanel = shouldShowProofPackStatePanel(model.state, errorMessage);
  const actionPending = Boolean(pendingAction);

  return (
    <>
      {showStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={errorMessage ? "Evidence pack is unavailable" : stateCopy.title}
          body={errorMessage ?? stateCopy.body}
        />
      ) : null}

      <div className="proof-pack-status-strip">
        <MetricRow label="Evidence Status" value={model.evidenceStatusLabel} />
        <MetricRow label="Approval Readiness" value={model.approvalReadinessLabel} />
        <MetricRow label="Mandate Coverage" value={model.mandateCoverageLabel} />
        <MetricRow label="Report Readiness" value={model.reportReadinessLabel} />
      </div>

      <div className="proof-pack-action-row" aria-label="Evidence pack actions">
        <ActionButton priority="secondary" onClick={onGenerateProofPack} disabled={!rebalanceRunId || actionPending}>
          {pendingAction === "Generate proof pack" ? "Preparing" : "Prepare evidence"}
        </ActionButton>
        <ActionButton priority="secondary" onClick={onLoadProofPack} disabled={!proofPackId || actionPending}>
          {pendingAction === "Load proof pack" ? "Loading" : "Load evidence"}
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={onLoadMarkdown}
          disabled={!proofPackId || !model.markdownAvailable || actionPending}
        >
          {pendingAction === "Load summary" ? "Loading summary" : "Load summary"}
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={onLoadReportInput}
          disabled={!proofPackId || !model.reportInputAvailable || actionPending}
        >
          Generate client report
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={onRequestAiPmMemo}
          disabled={!proofPackId || !model.aiEvidenceInputAvailable || actionPending}
        >
          {pendingAction === "Open advisor memo" ? "Opening memo" : "Open advisor memo"}
        </ActionButton>
      </div>

      {actionError || handoffStatus ? (
        <Text variant="secondary" className="muted">
          {actionError ?? handoffStatus}
        </Text>
      ) : (
        <Text variant="secondary" className="muted">
          Evidence pack actions are backed by the Gateway proof-pack endpoints for the selected mandate.
        </Text>
      )}

      {model.supportabilityReasons.length > 0 ? (
        <div className="proof-pack-reason-row">
          {model.supportabilityReasons.map((reason) => (
            <ProofPackStateBadge key={reason} state={reason} reason />
          ))}
        </div>
      ) : null}
    </>
  );
}
