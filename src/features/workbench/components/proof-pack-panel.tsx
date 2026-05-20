"use client";

import { useState } from "react";
import {
  ActionButton,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  Text,
} from "@/design-system";
import {
  ProofPackAvailabilityBadge,
  ProofPackStateBadge,
} from "@/features/workbench/components/proof-pack-badges";
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
  proofPackStatePanelCopy,
  readProofPackAiWorkflowPackStatus,
  readProofPackMarkdown,
  shouldShowProofPackStatePanel,
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
  const shouldShowStatePanel = shouldShowProofPackStatePanel(model.state, errorMessage);
  const stateCopy = proofPackStatePanelCopy(model.state, portfolioId);

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
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={errorMessage ? "Evidence pack is unavailable" : stateCopy.title}
          body={errorMessage ?? stateCopy.body}
        />
      ) : null}

      <div className="proof-pack-status-strip">
        <MetricRow label="Evidence Status" value={model.evidenceStatusLabel} />
        <MetricRow
          label="Approval Readiness"
          value={model.approvalReadinessLabel}
        />
        <MetricRow label="Mandate Coverage" value={model.mandateCoverageLabel} />
        <MetricRow label="Report Readiness" value={model.reportReadinessLabel} />
      </div>

      <div className="proof-pack-action-row" aria-label="Evidence pack actions">
        <ActionButton priority="secondary" onClick={generateProofPack} disabled={!rebalanceRunId || Boolean(pendingAction)}>
          {pendingAction === "Generate proof pack" ? "Preparing" : "Prepare evidence"}
        </ActionButton>
        <ActionButton priority="secondary" onClick={loadProofPack} disabled={!proofPackId || Boolean(pendingAction)}>
          {pendingAction === "Load proof pack" ? "Loading" : "Load evidence"}
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={loadMarkdown}
          disabled={!proofPackId || !model.markdownAvailable || Boolean(pendingAction)}
        >
          {pendingAction === "Load summary" ? "Loading summary" : "Load summary"}
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={loadReportInput}
          disabled={!proofPackId || !model.reportInputAvailable || Boolean(pendingAction)}
        >
          Generate client report
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={requestAiPmMemo}
          disabled={!proofPackId || !model.aiEvidenceInputAvailable || Boolean(pendingAction)}
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
