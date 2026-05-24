"use client";

import { useMemo, useState } from "react";

import {
  ActionButton,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
} from "@/design-system";
import { requestDpmExceptionSummary } from "@/features/workbench/dpm-command-center-api";
import {
  requestDpmOperationsHandoffSummary,
  requestDpmWaveAiPmMemo,
} from "@/features/workbench/dpm-wave-api";
import { requestDpmOutcomeReviewAiNarrative } from "@/features/workbench/outcome-review-api";
import { requestDpmPmOperatingQualitySummary } from "@/features/workbench/pm-operating-quality-api";
import { requestDpmProofPackAiPmMemo } from "@/features/workbench/proof-pack-api";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";

type CopilotActionKey =
  | "proof-pack-memo"
  | "wave-memo"
  | "operations-handoff"
  | "exception-summary"
  | "outcome-narrative"
  | "pm-quality-summary";

type CopilotAction = {
  key: CopilotActionKey;
  label: string;
  detail: string;
  reference: string | null;
  blockedReason: string | null;
  run: () => Promise<unknown>;
};

type ActionState = {
  pending: CopilotActionKey | null;
  message: string | null;
  error: string | null;
};

export default function DpmCopilotWorkspace({
  data,
  mandateId,
}: {
  data: ManageWorkspaceData;
  mandateId?: string | null;
}) {
  const portfolioId = data.portfolio.portfolio.portfolio_id;
  const [actionState, setActionState] = useState<ActionState>({
    pending: null,
    message: null,
    error: null,
  });
  const actions = useMemo(
    () => buildCopilotActions({ data, portfolioId, mandateId: mandateId ?? null }),
    [data, mandateId, portfolioId]
  );
  const readyCount = actions.filter((action) => !action.blockedReason).length;

  async function runAction(action: CopilotAction) {
    if (action.blockedReason || actionState.pending) {
      return;
    }
    setActionState({ pending: action.key, message: null, error: null });
    try {
      const response = await action.run();
      setActionState({
        pending: null,
        message: `${action.label} accepted by Gateway. ${summarizeWorkflowResponse(response)}`,
        error: null,
      });
    } catch (error) {
      setActionState({
        pending: null,
        message: null,
        error: error instanceof Error ? error.message : `${action.label} failed.`,
      });
    }
  }

  return (
    <SectionBlock
      title="PM Copilot Workspace"
      subtitle="Review-gated AI workflow-pack requests over Manage-owned evidence and Gateway composition."
      className="dpm-copilot-workspace"
      actions={
        <div className="dpm-copilot-badge-row" aria-label="PM copilot posture">
          <SemanticBadge tone={readyCount > 0 ? "success" : "warn"}>{readyCount} ready</SemanticBadge>
          <SemanticBadge>Gateway only</SemanticBadge>
          <SemanticBadge>No prompt storage</SemanticBadge>
        </div>
      }
    >
      <div className="dpm-copilot-status-strip">
        <MetricRow label="Portfolio" value={portfolioId} />
        <MetricRow label="Mandate" value={mandateId ?? "N/A"} />
        <MetricRow label="Evidence Owner" value="lotus-manage" />
        <MetricRow label="Workflow Owner" value="lotus-ai" />
        <MetricRow label="Gateway Surface" value="lotus-gateway BFF" />
        <MetricRow label="Forbidden Uses" value="client contact, orders, OMS" />
      </div>

      {actionState.error ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Copilot request needs attention"
          body={actionState.error}
        />
      ) : null}
      {actionState.message ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Copilot request accepted"
          body={actionState.message}
        />
      ) : null}

      <div className="dpm-copilot-action-grid">
        {actions.map((action) => (
          <section key={action.key} className="dpm-copilot-action-card">
            <div>
              <strong>{action.label}</strong>
              <span>{action.detail}</span>
            </div>
            <MetricRow label="Source Ref" value={action.reference ?? "N/A"} />
            <MetricRow
              label="Readiness"
              value={action.blockedReason ? action.blockedReason : "Ready through Gateway"}
            />
            <ActionButton
              priority={action.blockedReason ? "quiet" : "secondary"}
              disabled={Boolean(action.blockedReason) || Boolean(actionState.pending)}
              onClick={() => void runAction(action)}
            >
              {actionState.pending === action.key ? "Requesting" : "Request"}
            </ActionButton>
          </section>
        ))}
      </div>

      <ScreenStatePanel
        kind="partial"
        surface="portfolio"
        title="Operating boundaries"
        body={
          "This workspace requests bounded workflow-pack runs only. It does not generate prompts in the browser, store generated summary text, rank PMs, contact clients, approve trades, route orders, claim OMS execution, or infer missing source facts."
        }
      />
    </SectionBlock>
  );
}

function buildCopilotActions({
  data,
  portfolioId,
  mandateId,
}: {
  data: ManageWorkspaceData;
  portfolioId: string;
  mandateId: string | null;
}): CopilotAction[] {
  const proofPackId = readFirstString(data.proofPack?.data, ["proof_pack_id"]) ??
    readFirstString(firstArrayItem(data.outcomeReviews?.data, "items"), ["proof_pack_id"]);
  const waveId = readFirstString(firstArrayItem(data.waves?.data, "items"), ["wave_id"]);
  const exceptionId = readFirstString(firstArrayItem(data.commandCenterExceptions?.data, "items"), [
    "exception_id",
  ]);
  const outcomeReviewId = readFirstString(firstArrayItem(data.outcomeReviews?.data, "items"), [
    "outcome_review_id",
  ]);
  const scoreRunId =
    readFirstString(firstArrayItem(data.pmOperatingQualityScoreRuns?.data, "items"), [
      "score_run_id",
    ]) ?? readFirstString(data.pmOperatingQualityScoreRuns?.supportability, ["score_run_id"]);

  return [
    {
      key: "proof-pack-memo",
      label: "Proof-Pack PM Memo",
      detail: "Request a review-required PM memo from proof-pack AI evidence.",
      reference: proofPackId,
      blockedReason: proofPackId ? null : "No proof pack available",
      run: () => requestDpmProofPackAiPmMemo({ proofPackId: proofPackId ?? "" }),
    },
    {
      key: "wave-memo",
      label: "Wave PM Memo",
      detail: "Request PM review commentary for a Manage-owned rebalance wave.",
      reference: waveId,
      blockedReason: waveId ? null : "No rebalance wave available",
      run: () => requestDpmWaveAiPmMemo(waveId ?? ""),
    },
    {
      key: "operations-handoff",
      label: "Operations Handoff Summary",
      detail: "Request support-only handoff posture for operations and investment control.",
      reference: waveId,
      blockedReason: waveId ? null : "No rebalance wave available",
      run: () => requestDpmOperationsHandoffSummary(waveId ?? ""),
    },
    {
      key: "exception-summary",
      label: "Exception Summary",
      detail: "Request triage support over a Manage monitoring exception.",
      reference: exceptionId,
      blockedReason: exceptionId ? null : "No monitoring exception available",
      run: () =>
        requestDpmExceptionSummary({
          exceptionId: exceptionId ?? "",
          portfolioId,
          mandateId: mandateId ?? undefined,
          state: "ACTIVE",
        }),
    },
    {
      key: "outcome-narrative",
      label: "Outcome Narrative",
      detail: "Request PM/CIO/control summary over realized outcome-review evidence.",
      reference: outcomeReviewId,
      blockedReason: outcomeReviewId ? null : "No outcome review available",
      run: () => requestDpmOutcomeReviewAiNarrative({ outcomeReviewId: outcomeReviewId ?? "" }),
    },
    {
      key: "pm-quality-summary",
      label: "PM Quality Support Summary",
      detail: "Request support-only summary posture over Manage PM operating-quality evidence.",
      reference: scoreRunId,
      blockedReason: scoreRunId ? null : "No PM quality score run available",
      run: () => requestDpmPmOperatingQualitySummary({ scoreRunId: scoreRunId ?? "" }),
    },
  ];
}

function summarizeWorkflowResponse(response: unknown): string {
  const record = asRecord(response);
  const source = readFirstString(record, ["source_service"]) ?? "Gateway";
  const status = readFirstString(record, ["upstream_status", "ai_upstream_status"]) ?? "accepted";
  const data = asRecord(record.data);
  const workflowRun =
    readFirstString(asRecord(data.workflow_pack_run), ["run_id", "workflow_run_id"]) ??
    readFirstString(record, ["workflow_run_id", "run_id"]) ??
    "run posture returned";
  return `${source} status ${status}; ${workflowRun}.`;
}

function firstArrayItem(source: unknown, key: string): Record<string, unknown> | null {
  const values = asRecord(source)[key];
  return Array.isArray(values) ? asRecord(values[0]) : null;
}

function readFirstString(source: unknown, keys: string[]): string | null {
  const record = asRecord(source);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
