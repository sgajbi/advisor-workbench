"use client";

import { useState } from "react";
import {
  ActionButton,
  AnalyticsTable,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  Text,
} from "@/design-system";
import {
  ProofPackAvailabilityBadge,
  ProofPackStateBadge,
} from "@/features/workbench/components/proof-pack-badges";
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

      <div className="proof-pack-workspace-grid">
        <div className="proof-pack-card">
          <div className="proof-pack-card-header">
            <h3>Evidence Areas</h3>
            <span>{model.evidenceRows.length} areas</span>
          </div>
          <AnalyticsTable
            ariaLabel="Evidence areas"
            variant="analysis"
            density="compact"
            columns={[
              { key: "area", label: "Evidence Area" },
              { key: "status", label: "Status" },
              { key: "finding", label: "Business Finding" },
              { key: "action", label: "Action" },
            ]}
            rows={model.evidenceRows.map((row) => ({
              key: row.key,
              cells: [
                row.area,
                <ProofPackStateBadge key={`${row.key}-state`} state={row.status} />,
                row.finding,
                row.action,
              ],
            }))}
            emptyState={{
              title: "No evidence areas available",
              body: "Evidence areas are not available yet.",
            }}
          />
        </div>

        <div className="proof-pack-action-stack" aria-label="Recommended evidence actions">
          <button type="button" disabled={!proofPackId || !model.aiEvidenceInputAvailable || Boolean(pendingAction)} onClick={requestAiPmMemo}>
            <strong>Open advisor memo</strong>
            <span>Prepare advisor handoff commentary from the evidence pack.</span>
          </button>
          <button type="button" disabled={!proofPackId || !model.reportInputAvailable || Boolean(pendingAction)} onClick={loadReportInput}>
            <strong>Generate client report</strong>
            <span>Use the report-ready evidence payload for client-facing material.</span>
          </button>
          <button type="button" disabled={!proofPackId || !model.markdownAvailable || Boolean(pendingAction)} onClick={loadMarkdown}>
            <strong>Load evidence summary</strong>
            <span>Open the evidence summary returned by Gateway.</span>
          </button>
          <a href={`/workbench/${encodeURIComponent(portfolioId)}?mode=reviews`}>Return to outcome review</a>
        </div>
      </div>

      <div className="proof-pack-detail-grid">
        <section className="proof-pack-detail-card">
          <h3>Detail: {model.selectedEvidenceTitle}</h3>
          <p>{model.selectedEvidenceSummary}</p>
          <div className="proof-pack-subgrid">
            <div>
              <h4>Coverage Checklist</h4>
              <ul>
                {model.coverageItems.length ? (
                  model.coverageItems.map((item) => (
                    <li key={item.key}>{item.area}</li>
                  ))
                ) : (
                  <li>No completed coverage items returned.</li>
                )}
              </ul>
            </div>
            <div>
              <h4>Supporting Documents</h4>
              <div className="proof-pack-document-list">
                {model.documents.length ? (
                  model.documents.map((document) => (
                    <span key={document.key}>
                      <strong>{document.label}</strong>
                      <em>{document.status}</em>
                    </span>
                  ))
                ) : (
                  <span>
                    <strong>No supporting document references returned</strong>
                    <em>Not available</em>
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="proof-pack-rationale-card">
          <h3>Advisor Rationale</h3>
          <p>{model.advisorRationale}</p>
          <div className="proof-pack-handoff-row" aria-label="Evidence pack handoff posture">
            <ProofPackAvailabilityBadge label="Summary" available={model.markdownAvailable} />
            <ProofPackAvailabilityBadge label="Report" available={model.reportInputAvailable} />
            <ProofPackAvailabilityBadge label="Memo" available={model.aiEvidenceInputAvailable} />
          </div>
        </section>
      </div>

      {markdown ? (
        <pre className="proof-pack-markdown-preview" aria-label="Evidence pack summary preview">
          {markdown}
        </pre>
      ) : null}
    </SectionBlock>
  );
}
