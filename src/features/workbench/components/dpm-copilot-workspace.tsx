"use client";

import { useMemo, useRef, useState } from "react";

import {
  ActionButton,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
} from "@/design-system";
import DpmAiWorkflowResult from "@/features/workbench/components/dpm-ai-workflow-result";
import {
  buildDpmAiWorkflowOutcome,
  type DpmAiWorkflowOutcome,
} from "@/features/workbench/dpm-ai-workflow-disclosure";
import type { DpmAiWorkflowGatewayEnvelope } from "@/features/workbench/dpm-ai-workflow-contract";
import type { DpmAiWorkflowFamily } from "@/features/workbench/dpm-ai-workflow-profiles";
import { requestDpmExceptionSummary } from "@/features/workbench/dpm-command-center-api";
import {
  requestDpmOperationsHandoffSummary,
  requestDpmWaveAiPmMemo,
} from "@/features/workbench/dpm-wave-api";
import { requestDpmOutcomeReviewAiNarrative } from "@/features/workbench/outcome-review-api";
import { requestDpmPmOperatingQualitySummary } from "@/features/workbench/pm-operating-quality-api";
import { requestDpmProofPackAiPmMemo } from "@/features/workbench/proof-pack-api";
import { buildProofPackPanelModel } from "@/features/workbench/proof-pack-view-model";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";

type CopilotAction = {
  key: DpmAiWorkflowFamily;
  contextKey: string;
  label: string;
  detail: string;
  referenceLabel: string;
  reference: string | null;
  blockedReason: string | null;
  run: () => Promise<DpmAiWorkflowGatewayEnvelope>;
};

type ActionState = {
  pending: { key: DpmAiWorkflowFamily; contextKey: string } | null;
  result: { contextKey: string; outcome: DpmAiWorkflowOutcome } | null;
  error: { contextKey: string; message: string } | null;
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
    result: null,
    error: null,
  });
  const requestSequenceRef = useRef(0);
  const actions = useMemo(
    () => buildCopilotActions({ data, portfolioId, mandateId: mandateId ?? null }),
    [data, mandateId, portfolioId]
  );
  const currentContextKeys = useMemo(
    () => new Set(actions.map((action) => action.contextKey)),
    [actions],
  );
  const pending =
    actionState.pending && currentContextKeys.has(actionState.pending.contextKey)
      ? actionState.pending
      : null;
  const result =
    actionState.result && currentContextKeys.has(actionState.result.contextKey)
      ? actionState.result
      : null;
  const error =
    actionState.error && currentContextKeys.has(actionState.error.contextKey)
      ? actionState.error
      : null;
  const readyCount = actions.filter((action) => !action.blockedReason).length;

  async function runAction(action: CopilotAction) {
    if (action.blockedReason || pending) {
      return;
    }
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setActionState({
      pending: { key: action.key, contextKey: action.contextKey },
      result: null,
      error: null,
    });
    try {
      const response = await action.run();
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }
      setActionState({
        pending: null,
        result: {
          contextKey: action.contextKey,
          outcome: buildDpmAiWorkflowOutcome(action.key, response),
        },
        error: null,
      });
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }
      setActionState({
        pending: null,
        result: null,
        error: {
          contextKey: action.contextKey,
          message: error instanceof Error ? error.message : `${action.label} failed.`,
        },
      });
    }
  }

  return (
    <SectionBlock
      title="PM Copilot Workspace"
      subtitle="Prepare internal decision-support material from governed portfolio evidence, with review and use boundaries kept explicit."
      className="dpm-copilot-workspace"
      actions={
        <div className="dpm-copilot-badge-row" aria-label="PM copilot posture">
          <SemanticBadge tone={readyCount > 0 ? "success" : "warn"}>
            {readyCount} workflows available
          </SemanticBadge>
          <SemanticBadge>Human review governed</SemanticBadge>
          <SemanticBadge>Internal decision support</SemanticBadge>
        </div>
      }
    >
      <div className="dpm-copilot-status-strip">
        <MetricRow layout="stacked" label="Portfolio" value={portfolioId} />
        <MetricRow layout="stacked" label="Mandate" value={mandateId ?? "N/A"} />
        <MetricRow
          layout="stacked"
          label="Available Workflows"
          value={`${readyCount} of ${actions.length}`}
        />
        <MetricRow
          layout="stacked"
          label="Decision Authority"
          value="Portfolio manager and investment control"
        />
        <MetricRow layout="stacked" label="Permitted Use" value="Internal decision support" />
        <MetricRow
          layout="stacked"
          label="Restricted Use"
          value="Client communication and order execution"
        />
      </div>

      {error ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Copilot request needs attention"
          body={error.message}
        />
      ) : null}
      {result ? (
        <DpmAiWorkflowResult outcome={result.outcome} focusOnMount />
      ) : null}

      <div className="dpm-copilot-action-grid">
        {actions.map((action) => (
          <section key={action.key} className="dpm-copilot-action-card">
            <div>
              <strong>{action.label}</strong>
              <span>{action.detail}</span>
            </div>
            <MetricRow label={action.referenceLabel} value={action.reference ?? "Not available"} />
            <MetricRow
              label="Readiness"
              value={action.blockedReason ? action.blockedReason : "Available to prepare"}
            />
            <ActionButton
              priority={action.blockedReason ? "quiet" : "secondary"}
              disabled={Boolean(action.blockedReason) || Boolean(pending)}
              onClick={() => void runAction(action)}
              aria-label={
                action.blockedReason
                  ? `${action.label} unavailable: ${action.blockedReason}`
                  : `Prepare ${action.label}`
              }
            >
              {action.blockedReason
                ? "Unavailable"
                : pending?.key === action.key
                  ? "Preparing"
                  : "Prepare"}
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
  const proofPackModel = buildProofPackPanelModel(data.proofPack);
  const currentProofPackId = proofPackModel.proofPackId === "N/A"
    ? null
    : proofPackModel.proofPackId;
  const historicalProofPackId = readFirstString(
    firstArrayItem(data.outcomeReviews?.data, "items"),
    ["proof_pack_id"]
  );
  const proofPackReference = currentProofPackId ?? historicalProofPackId;
  const proofPackBlockedReason = resolveProofPackMemoBlockedReason({
    currentProofPackId,
    historicalProofPackId,
    supportabilityState: proofPackModel.supportabilityState,
    aiEvidenceInputAvailable: proofPackModel.aiEvidenceInputAvailable,
  });
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

  const actions: Array<Omit<CopilotAction, "contextKey">> = [
    {
      key: "proof-pack-memo",
      label: "Proof-Pack PM Memo",
      detail: "Request a review-required PM memo from proof-pack AI evidence.",
      referenceLabel: currentProofPackId ? "Reference" : "Historical Reference",
      reference: proofPackReference,
      blockedReason: proofPackBlockedReason,
      run: () => requestDpmProofPackAiPmMemo({ proofPackId: currentProofPackId ?? "" }),
    },
    {
      key: "wave-memo",
      label: "Wave PM Memo",
      detail: "Request PM review commentary for a Manage-owned rebalance wave.",
      referenceLabel: "Reference",
      reference: waveId,
      blockedReason: waveId ? null : "No rebalance wave available",
      run: () => requestDpmWaveAiPmMemo(waveId ?? ""),
    },
    {
      key: "operations-handoff",
      label: "Operations Handoff Summary",
      detail: "Request support-only handoff posture for operations and investment control.",
      referenceLabel: "Reference",
      reference: waveId,
      blockedReason: waveId ? null : "No rebalance wave available",
      run: () => requestDpmOperationsHandoffSummary(waveId ?? ""),
    },
    {
      key: "exception-summary",
      label: "Exception Summary",
      detail: "Request triage support over a Manage monitoring exception.",
      referenceLabel: "Reference",
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
      referenceLabel: "Reference",
      reference: outcomeReviewId,
      blockedReason: outcomeReviewId ? null : "No outcome review available",
      run: () => requestDpmOutcomeReviewAiNarrative({ outcomeReviewId: outcomeReviewId ?? "" }),
    },
    {
      key: "pm-quality-summary",
      label: "PM Quality Support Summary",
      detail: "Request support-only summary posture over Manage PM operating-quality evidence.",
      referenceLabel: "Reference",
      reference: scoreRunId,
      blockedReason: scoreRunId ? null : "No PM quality score run available",
      run: () => requestDpmPmOperatingQualitySummary({ scoreRunId: scoreRunId ?? "" }),
    },
  ];
  return actions.map((action) => ({
    ...action,
    contextKey: JSON.stringify([
      portfolioId,
      mandateId,
      action.key,
      action.reference,
    ]),
  }));
}

function resolveProofPackMemoBlockedReason({
  currentProofPackId,
  historicalProofPackId,
  supportabilityState,
  aiEvidenceInputAvailable,
}: {
  currentProofPackId: string | null;
  historicalProofPackId: string | null;
  supportabilityState: string;
  aiEvidenceInputAvailable: boolean;
}): string | null {
  if (!currentProofPackId) {
    return historicalProofPackId
      ? "Current evidence pack unavailable"
      : "No current evidence pack available";
  }
  if (supportabilityState !== "READY") {
    return "Current evidence pack not ready";
  }
  if (!aiEvidenceInputAvailable) {
    return "Decision-support evidence unavailable";
  }
  return null;
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
