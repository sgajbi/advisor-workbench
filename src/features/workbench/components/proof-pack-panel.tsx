"use client";

import { SectionBlock } from "@/design-system";
import {
  ProofPackAvailabilityBadge,
  ProofPackStateBadge,
} from "@/features/workbench/components/proof-pack-badges";
import ProofPackSummary from "@/features/workbench/components/proof-pack-summary";
import ProofPackWorkspace from "@/features/workbench/components/proof-pack-workspace";
import type {
  DpmOutcomeReviewGatewayResponse,
  DpmProofPackGatewayResponse,
  WorkbenchOverview,
} from "@/features/workbench/types";
import { deriveProofPackContext } from "@/features/workbench/proof-pack-view-model";
import { useProofPackActions } from "@/features/workbench/use-proof-pack-actions";

type Props = {
  portfolioId: string;
  mandateId?: string | null;
  outcomeReviews: DpmOutcomeReviewGatewayResponse | null;
  rebalanceSnapshot?: WorkbenchOverview["rebalance_snapshot"] | null;
  initialProofPack: DpmProofPackGatewayResponse | null;
  errorMessage?: string | null;
};

export default function ProofPackPanel({
  portfolioId,
  mandateId,
  outcomeReviews,
  rebalanceSnapshot,
  initialProofPack,
  errorMessage,
}: Props) {
  const context = deriveProofPackContext(outcomeReviews, rebalanceSnapshot ?? null);
  const {
    model,
    proofPackId,
    rebalanceRunId,
    pendingAction,
    actionError,
    handoffStatus,
    markdown,
    generateProofPack,
    loadProofPack,
    loadMarkdown,
    loadReportInput,
    requestAiPmMemo,
  } = useProofPackActions({
    initialProofPack,
    contextProofPackId: context.proofPackId,
    contextRebalanceRunId: context.rebalanceRunId,
    contextMandateId: context.mandateId,
    mandateId,
  });

  return (
    <SectionBlock
      title="Evidence Pack"
      subtitle="Mandate evidence, approval readiness, and client handoff support."
      className="proof-pack-panel"
      actions={
        <div className="proof-pack-badge-row">
          <ProofPackStateBadge state={model.supportabilityState} />
          <ProofPackAvailabilityBadge label="Evidence" statusLabel={model.evidenceStatusLabel} />
        </div>
      }
    >
      <ProofPackSummary
        model={model}
        portfolioId={portfolioId}
        proofPackId={proofPackId}
        rebalanceRunId={rebalanceRunId}
        pendingAction={pendingAction}
        actionError={actionError}
        handoffStatus={handoffStatus}
        errorMessage={errorMessage}
        onGenerateProofPack={generateProofPack}
        onLoadProofPack={loadProofPack}
        onLoadMarkdown={loadMarkdown}
        onLoadReportInput={loadReportInput}
        onRequestAiPmMemo={requestAiPmMemo}
      />

      <ProofPackWorkspace
        model={model}
        portfolioId={portfolioId}
        proofPackId={proofPackId}
        pendingAction={pendingAction}
        onRequestAiPmMemo={requestAiPmMemo}
        onLoadReportInput={loadReportInput}
        onLoadMarkdown={loadMarkdown}
      />

      {markdown ? (
        <pre className="proof-pack-markdown-preview" aria-label="Evidence pack summary preview">
          {markdown}
        </pre>
      ) : null}
    </SectionBlock>
  );
}
