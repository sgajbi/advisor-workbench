"use client";

import { useState } from "react";
import {
  ActionButton,
  AnalyticsTable,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
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
  type ProofPackPanelState,
} from "@/features/workbench/proof-pack-view-model";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  portfolioId: string;
  mandateId?: string | null;
  outcomeReviews: DpmOutcomeReviewGatewayResponse | null;
  rebalanceSnapshot?: WorkbenchOverview["rebalance_snapshot"] | null;
  initialProofPack: DpmProofPackGatewayResponse | null;
  errorMessage?: string | null;
};

function badgeTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toUpperCase();
  if (normalized === "SUPPORTED" || normalized === "READY" || normalized === "COMPLETE") {
    return "success";
  }
  if (normalized === "DEGRADED" || normalized === "PARTIAL" || normalized.includes("PENDING")) {
    return "warn";
  }
  if (normalized === "BLOCKED" || normalized === "UNSUPPORTED" || normalized === "FAILED") {
    return "danger";
  }
  return "default";
}

function statePanelCopy(state: ProofPackPanelState, portfolioId: string) {
  if (state === "empty") {
    return {
      kind: "empty" as const,
      title: "No evidence pack linked to this portfolio",
      body: `No evidence pack is currently linked to ${portfolioId}.`,
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked" as const,
      title: "Evidence handoff is blocked",
      body: "Resolve the open rebalance items before preparing decision evidence.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable" as const,
      title: "Evidence pack is not supported",
      body: "Evidence preparation is not available for the current rebalance state.",
    };
  }
  return {
    kind: "partial" as const,
    title: "Evidence pack is unavailable",
    body: "Evidence details are temporarily unavailable for this portfolio.",
  };
}

function availabilityLabel(available: boolean): string {
  return available ? "Available" : "Unavailable";
}

function availabilityTone(value: string): "default" | "success" | "warn" | "danger" {
  const normalized = value.toUpperCase();
  if (normalized.includes("AVAILABLE") || normalized.includes("COMPLETE") || normalized.includes("READY")) {
    return "success";
  }
  if (normalized.includes("PENDING") || normalized.includes("REVIEW")) {
    return "warn";
  }
  if (normalized.includes("BLOCKED") || normalized.includes("UNAVAILABLE")) {
    return "danger";
  }
  return "default";
}

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
  const shouldShowStatePanel =
    Boolean(errorMessage) ||
    model.state === "empty" ||
    model.state === "blocked" ||
    model.state === "unsupported" ||
    model.state === "unavailable";
  const stateCopy = statePanelCopy(model.state, portfolioId);

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
      setMarkdown(readMarkdown(response));
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
      setHandoffStatus(`Advisor memo ${readAiWorkflowPackStatus(response.data)}`);
    });
  }

  return (
    <SectionBlock
      title="Evidence Pack"
      subtitle="Mandate evidence, approval readiness, and client handoff support."
      className="proof-pack-panel"
      actions={
        <div className="proof-pack-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
            {businessStateLabel(model.supportabilityState)}
          </SemanticBadge>
          <SemanticBadge tone={availabilityTone(model.evidenceStatusLabel)}>
            Evidence {model.evidenceStatusLabel}
          </SemanticBadge>
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
            <SemanticBadge key={reason} tone={badgeTone(reason)}>
              {formatBusinessReason(reason)}
            </SemanticBadge>
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
                <SemanticBadge key={`${row.key}-state`} tone={badgeTone(row.status)}>
                  {businessStateLabel(row.status)}
                </SemanticBadge>,
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
            <SemanticBadge tone={model.markdownAvailable ? "success" : "default"}>
              Summary {availabilityLabel(model.markdownAvailable)}
            </SemanticBadge>
            <SemanticBadge tone={model.reportInputAvailable ? "success" : "default"}>
              Report {availabilityLabel(model.reportInputAvailable)}
            </SemanticBadge>
            <SemanticBadge tone={model.aiEvidenceInputAvailable ? "success" : "default"}>
              Memo {availabilityLabel(model.aiEvidenceInputAvailable)}
            </SemanticBadge>
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

function readMarkdown(response: DpmProofPackGatewayResponse & { markdown?: unknown }): string {
  if (typeof response.markdown === "string") {
    return response.markdown;
  }
  if (typeof response.data.markdown === "string") {
    return response.data.markdown;
  }
  if (typeof response.data.content === "string") {
    return response.data.content;
  }
  return "No summary content is available for this evidence pack.";
}

function readAiWorkflowPackStatus(data: Record<string, unknown>): string {
  const workflowPackRun = readRecord(data.workflow_pack_run);
  const reviewState = readString(workflowPackRun.review_state);
  if (reviewState) {
    return `${businessStateLabel(reviewState)}.`;
  }

  return "request submitted.";
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
