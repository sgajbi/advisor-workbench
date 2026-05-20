"use client";

import { useState } from "react";
import { SectionBlock } from "@/design-system";
import {
  ProofPackAvailabilityBadge,
  ProofPackStateBadge,
} from "@/features/workbench/components/proof-pack-badges";
import ProofPackSummary from "@/features/workbench/components/proof-pack-summary";
import ProofPackWorkspace from "@/features/workbench/components/proof-pack-workspace";
import {
  generateDpmProofPackFromRun,
  getDpmProofPack,
  getDpmProofPackMarkdown,
  getDpmProofPackReportInput,
  requestDpmProofPackAiPmMemo,
} from "@/features/workbench/api";
import type {
  DpmOutcomeReviewGatewayResponse,
  DpmProofPackGatewayResponse,
  WorkbenchOverview,
} from "@/features/workbench/types";
import {
  buildProofPackPanelModel,
  deriveProofPackContext,
} from "@/features/workbench/proof-pack-view-model";
import {
  readProofPackAiWorkflowPackStatus,
  readProofPackMarkdown,
} from "@/features/workbench/proof-pack-panel-helpers";

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
  const [proofPack, setProofPack] = useState<DpmProofPackGatewayResponse | null>(initialProofPack);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const model = buildProofPackPanelModel(proofPack);
  const proofPackId = model.proofPackId !== "N/A" ? model.proofPackId : context.proofPackId;
  const rebalanceRunId =
    context.rebalanceRunId ?? (model.rebalanceRunId !== "N/A" ? model.rebalanceRunId : null);
  const resolvedMandateId =
    mandateId ?? context.mandateId ?? (model.mandateId !== "N/A" ? model.mandateId : null);

  async function runAction(label: string, action: () => Promise<void>) {
    if (pendingAction) {
      return;
    }
    setPendingAction(label);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setPendingAction(null);
    }
  }

  function loadProofPack() {
    if (!proofPackId) {
      return;
    }
    void runAction("Load proof pack", async () => {
      setProofPack(await getDpmProofPack(proofPackId));
      setHandoffStatus("Evidence pack loaded.");
    });
  }

  function generateProofPack() {
    if (!rebalanceRunId) {
      return;
    }
    void runAction("Generate proof pack", async () => {
      const generated = await generateDpmProofPackFromRun({
        rebalanceRunId,
        mandateId: resolvedMandateId,
      });
      setProofPack(generated);
      setHandoffStatus("Evidence pack prepared.");
    });
  }

  function loadMarkdown() {
    if (!proofPackId) {
      return;
    }
    void runAction("Load summary", async () => {
      const response = await getDpmProofPackMarkdown(proofPackId);
      setMarkdown(readProofPackMarkdown(response));
      setHandoffStatus("Summary loaded.");
    });
  }

  function loadReportInput() {
    if (!proofPackId) {
      return;
    }
    void runAction("Generate client report", async () => {
      const response = await getDpmProofPackReportInput(proofPackId);
      setHandoffStatus(
        `Client report ${response.supportability.report_input_available ? "ready for generation" : "not available"}.`
      );
    });
  }

  function requestAiPmMemo() {
    if (!proofPackId) {
      return;
    }
    void runAction("Open advisor memo", async () => {
      const response = await requestDpmProofPackAiPmMemo({ proofPackId });
      setHandoffStatus(`Advisor memo ${readProofPackAiWorkflowPackStatus(response.data)}`);
    });
  }

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
