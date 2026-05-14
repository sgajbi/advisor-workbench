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
import {
  businessStateLabel,
  formatBusinessReason,
  formatBusinessSource,
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

function formatSectionSummary(summary: string): string {
  if (summary === "N/A") {
    return summary;
  }
  return summary
    .split(",")
    .map((part) => {
      const [state, count] = part.split(":").map((value) => value.trim());
      return state && count ? `${businessStateLabel(state)}: ${count}` : part.trim();
    })
    .join(", ");
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
    void runAction("Load Markdown", async () => {
      const response = await getDpmProofPackMarkdown(proofPackId);
      setMarkdown(readMarkdown(response));
      setHandoffStatus("Summary loaded.");
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
      setHandoffStatus(`PM memo ${readAiWorkflowPackStatus(response.data)}`);
    });
  }

  return (
    <SectionBlock
      title="Evidence Packs"
      subtitle="Decision evidence prepared for advisor review and audit."
      className="proof-pack-panel"
      actions={
        <div className="proof-pack-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
            {businessStateLabel(model.supportabilityState)}
          </SemanticBadge>
          <SemanticBadge>Audit trail available</SemanticBadge>
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
        <MetricRow label="Evidence Pack" value={model.proofPackId} />
        <MetricRow
          label="Status"
          value={<SemanticBadge tone={badgeTone(model.status)}>{businessStateLabel(model.status)}</SemanticBadge>}
        />
        <MetricRow label="Sections" value={formatSectionSummary(model.sectionStateSummary)} />
        <MetricRow label="Audit Trail" value={model.contentHash !== "N/A" ? "Available" : "Not available"} />
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
          Evidence Input
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={requestAiPmMemo}
          disabled={!proofPackId || !model.aiEvidenceInputAvailable || Boolean(pendingAction)}
        >
          {pendingAction === "Request AI PM Memo" ? "Requesting memo" : "PM memo"}
        </ActionButton>
      </div>

      {actionError || handoffStatus ? (
        <Text variant="secondary" className="muted">
          {actionError ?? handoffStatus}
        </Text>
      ) : (
        <Text variant="secondary" className="muted">
          Shows decision evidence, report inputs, memo readiness, and audit posture for the selected rebalance.
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

      <AnalyticsTable
        ariaLabel="Evidence pack sections"
        variant="analysis"
        density="compact"
        columns={[
          { key: "section", label: "Section" },
          { key: "state", label: "State" },
          { key: "source", label: "Business Area" },
          { key: "hash", label: "Audit" },
        ]}
        rows={model.sections.map((section) => ({
          key: section.key,
          cells: [
            businessStateLabel(section.section),
            <SemanticBadge key={`${section.key}-state`} tone={badgeTone(section.state)}>
              {businessStateLabel(section.state)}
            </SemanticBadge>,
            formatBusinessSource(section.source),
            section.hash !== "N/A" ? "Available" : "Not available",
          ],
        }))}
        emptyState={{
          title: "No evidence sections available",
          body: "Evidence section posture is not available yet.",
        }}
      />

      <AnalyticsTable
        ariaLabel="Evidence pack audit references"
        variant="observation"
        density="compact"
        columns={[
          { key: "source", label: "Business Area" },
          { key: "reference", label: "Reference" },
          { key: "hash", label: "Audit" },
        ]}
        rows={model.sourceHashes.map((source) => ({
          key: source.key,
          cells: [
            formatBusinessSource(source.source),
            source.reference !== "N/A" ? "Reference available" : "Reference not available",
            source.hash !== "N/A" ? "Available" : "Not available",
          ],
        }))}
        emptyState={{
          title: "No audit references available",
          body: "Audit references are not available yet.",
        }}
      />

      <div className="proof-pack-handoff-row" aria-label="Evidence pack handoff posture">
        <SemanticBadge tone={model.markdownAvailable ? "success" : "default"}>
          Markdown {availabilityLabel(model.markdownAvailable)}
        </SemanticBadge>
        <SemanticBadge tone={model.reportInputAvailable ? "success" : "default"}>
          Report Input {availabilityLabel(model.reportInputAvailable)}
        </SemanticBadge>
        <SemanticBadge tone={model.aiEvidenceInputAvailable ? "success" : "default"}>
          Evidence Input {availabilityLabel(model.aiEvidenceInputAvailable)}
        </SemanticBadge>
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
