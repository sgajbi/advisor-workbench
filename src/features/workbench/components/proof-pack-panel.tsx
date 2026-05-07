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
  getDpmProofPackAiEvidenceInput,
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
      title: "No proof pack linked to this portfolio",
      body: `Gateway did not return a manage proof-pack reference for ${portfolioId}.`,
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked" as const,
      title: "Proof-pack handoff is blocked",
      body: "Manage has blocked proof-pack evidence actions for this rebalance run.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable" as const,
      title: "Proof-pack evidence is not supported",
      body: "The authoritative manage supportability state says this proof-pack path is unsupported.",
    };
  }
  return {
    kind: "partial" as const,
    title: "Proof-pack evidence is unavailable",
    body: "Gateway did not return a usable manage proof-pack payload for this portfolio.",
  };
}

function availabilityLabel(available: boolean): string {
  return available ? "Available" : "Unavailable";
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
      setHandoffStatus("Proof-pack payload loaded from Gateway.");
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
      setHandoffStatus("Proof-pack generation completed through Gateway.");
    });
  }

  function loadMarkdown() {
    if (!proofPackId) {
      return;
    }
    void runAction("Load Markdown", async () => {
      const response = await getDpmProofPackMarkdown(proofPackId);
      setMarkdown(readMarkdown(response));
      setHandoffStatus("Markdown summary loaded from Gateway.");
    });
  }

  function loadReportInput() {
    if (!proofPackId) {
      return;
    }
    void runAction("Load Report Input", async () => {
      const response = await getDpmProofPackReportInput(proofPackId);
      setHandoffStatus(`Report input ${response.supportability.report_input_available ? "available" : "unavailable"}.`);
    });
  }

  function loadAiEvidence() {
    if (!proofPackId) {
      return;
    }
    void runAction("Load AI Evidence", async () => {
      const response = await getDpmProofPackAiEvidenceInput(proofPackId);
      setHandoffStatus(
        `AI evidence input ${response.supportability.ai_evidence_input_available ? "available" : "unavailable"}.`
      );
    });
  }

  function requestAiPmMemo() {
    if (!proofPackId) {
      return;
    }
    void runAction("Request AI PM Memo", async () => {
      const response = await requestDpmProofPackAiPmMemo({ proofPackId });
      setHandoffStatus(`PM memo ${readAiWorkflowPackStatus(response.data)}.`);
    });
  }

  return (
    <SectionBlock
      title="Proof-Pack Evidence"
      subtitle={`Manage authority: ${model.authority}. Correlation: ${model.correlationId}`}
      className="proof-pack-panel"
      actions={
        <div className="proof-pack-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
            {model.supportabilityState}
          </SemanticBadge>
          <SemanticBadge>{model.sourceService}</SemanticBadge>
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={errorMessage ? "Proof-pack endpoint is unavailable" : stateCopy.title}
          body={errorMessage ?? stateCopy.body}
        />
      ) : null}

      <div className="proof-pack-status-strip">
        <MetricRow label="Proof Pack" value={model.proofPackId} />
        <MetricRow
          label="Status"
          value={<SemanticBadge tone={badgeTone(model.status)}>{model.status}</SemanticBadge>}
        />
        <MetricRow label="Sections" value={model.sectionStateSummary} />
        <MetricRow label="Content Hash" value={model.contentHash} />
      </div>

      <div className="proof-pack-action-row" aria-label="Proof-pack actions">
        <ActionButton priority="secondary" onClick={generateProofPack} disabled={!rebalanceRunId || Boolean(pendingAction)}>
          {pendingAction === "Generate proof pack" ? "Generating" : "Generate proof pack"}
        </ActionButton>
        <ActionButton priority="secondary" onClick={loadProofPack} disabled={!proofPackId || Boolean(pendingAction)}>
          {pendingAction === "Load proof pack" ? "Loading" : "Load proof pack"}
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={loadMarkdown}
          disabled={!proofPackId || !model.markdownAvailable || Boolean(pendingAction)}
        >
          {pendingAction === "Load Markdown" ? "Loading Markdown" : "Load Markdown"}
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={loadReportInput}
          disabled={!proofPackId || !model.reportInputAvailable || Boolean(pendingAction)}
        >
          Report Input
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={loadAiEvidence}
          disabled={!proofPackId || !model.aiEvidenceInputAvailable || Boolean(pendingAction)}
        >
          AI Evidence
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={requestAiPmMemo}
          disabled={!proofPackId || !model.aiEvidenceInputAvailable || Boolean(pendingAction)}
        >
          {pendingAction === "Request AI PM Memo" ? "Requesting memo" : "AI PM Memo"}
        </ActionButton>
      </div>

      {actionError || handoffStatus ? (
        <Text variant="secondary" className="muted">
          {actionError ?? handoffStatus}
        </Text>
      ) : (
        <Text variant="secondary" className="muted">
          Shows Gateway-composed proof-pack identity, sections, hashes, Markdown, report-input, AI-evidence, and AI memo posture.
        </Text>
      )}

      {model.supportabilityReasons.length > 0 ? (
        <div className="proof-pack-reason-row">
          {model.supportabilityReasons.map((reason) => (
            <SemanticBadge key={reason} tone={badgeTone(reason)}>
              {reason}
            </SemanticBadge>
          ))}
        </div>
      ) : null}

      <AnalyticsTable
        ariaLabel="Proof-pack sections"
        variant="analysis"
        density="compact"
        columns={[
          { key: "section", label: "Section" },
          { key: "state", label: "State" },
          { key: "source", label: "Source" },
          { key: "hash", label: "Hash" },
        ]}
        rows={model.sections.map((section) => ({
          key: section.key,
          cells: [
            section.section,
            <SemanticBadge key={`${section.key}-state`} tone={badgeTone(section.state)}>
              {section.state}
            </SemanticBadge>,
            section.source,
            section.hash,
          ],
        }))}
        emptyState={{
          title: "No proof-pack sections returned",
          body: "Gateway did not return section posture for this manage proof pack.",
        }}
      />

      <AnalyticsTable
        ariaLabel="Proof-pack source hashes"
        variant="observation"
        density="compact"
        columns={[
          { key: "source", label: "Source" },
          { key: "reference", label: "Reference" },
          { key: "hash", label: "Hash" },
        ]}
        rows={model.sourceHashes.map((source) => ({
          key: source.key,
          cells: [source.source, source.reference, source.hash],
        }))}
        emptyState={{
          title: "No source hashes returned",
          body: "Manage returned the proof pack without source-hash lineage rows.",
        }}
      />

      <div className="proof-pack-handoff-row" aria-label="Proof-pack handoff posture">
        <SemanticBadge tone={model.markdownAvailable ? "success" : "default"}>
          Markdown {availabilityLabel(model.markdownAvailable)}
        </SemanticBadge>
        <SemanticBadge tone={model.reportInputAvailable ? "success" : "default"}>
          Report Input {availabilityLabel(model.reportInputAvailable)}
        </SemanticBadge>
        <SemanticBadge tone={model.aiEvidenceInputAvailable ? "success" : "default"}>
          AI Evidence {availabilityLabel(model.aiEvidenceInputAvailable)}
        </SemanticBadge>
      </div>

      {markdown ? (
        <pre className="proof-pack-markdown-preview" aria-label="Proof-pack Markdown preview">
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
  return "Gateway returned no Markdown content for this proof pack.";
}

function readAiWorkflowPackStatus(data: Record<string, unknown>): string {
  const workflowPackRun = readRecord(data.workflow_pack_run);
  const runId = readString(workflowPackRun.run_id);
  const reviewState = readString(workflowPackRun.review_state);
  if (runId && reviewState) {
    return `${reviewState} (${runId})`;
  }
  if (runId) {
    return `requested (${runId})`;
  }

  const execution = readRecord(data.execution);
  const audit = readRecord(execution.audit);
  const auditRunId = readString(audit.workflow_pack_run_id);
  return auditRunId ? `requested (${auditRunId})` : "request submitted through Gateway";
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
