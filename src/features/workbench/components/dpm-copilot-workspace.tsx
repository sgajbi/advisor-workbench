"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ActionButton,
  AiAssistanceDisclosure,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
} from "@/design-system";
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
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";

type CopilotAction = {
  key: DpmAiWorkflowFamily;
  label: string;
  detail: string;
  reference: string | null;
  blockedReason: string | null;
  run: () => Promise<DpmAiWorkflowGatewayEnvelope>;
};

type ActionState = {
  pending: DpmAiWorkflowFamily | null;
  result: DpmAiWorkflowOutcome | null;
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
    result: null,
    error: null,
  });
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const actions = useMemo(
    () => buildCopilotActions({ data, portfolioId, mandateId: mandateId ?? null }),
    [data, mandateId, portfolioId]
  );
  const readyCount = actions.filter((action) => !action.blockedReason).length;

  useEffect(() => {
    if (actionState.result) {
      resultHeadingRef.current?.focus();
    }
  }, [actionState.result]);

  async function runAction(action: CopilotAction) {
    if (action.blockedReason || actionState.pending) {
      return;
    }
    setActionState({ pending: action.key, result: null, error: null });
    try {
      const response = await action.run();
      setActionState({
        pending: null,
        result: buildDpmAiWorkflowOutcome(action.key, response),
        error: null,
      });
    } catch (error) {
      setActionState({
        pending: null,
        result: null,
        error: error instanceof Error ? error.message : `${action.label} failed.`,
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
        <MetricRow label="Portfolio" value={portfolioId} />
        <MetricRow label="Mandate" value={mandateId ?? "N/A"} />
        <MetricRow label="Available Workflows" value={`${readyCount} of ${actions.length}`} />
        <MetricRow label="Decision Authority" value="Portfolio manager and investment control" />
        <MetricRow label="Permitted Use" value="Internal decision support" />
        <MetricRow label="Restricted Use" value="Client communication and order execution" />
      </div>

      {actionState.error ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Copilot request needs attention"
          body={actionState.error}
        />
      ) : null}
      {actionState.result ? (
        <section
          className="dpm-copilot-result"
          aria-label="Latest decision-support result"
          aria-live="polite"
        >
          <div className="dpm-copilot-result-copy">
            <span>Latest result</span>
            <h3 ref={resultHeadingRef} tabIndex={-1}>
              {actionState.result.scopeLabel}
            </h3>
            <p>{actionState.result.businessSummary}</p>
          </div>
          <AiAssistanceDisclosure disclosure={actionState.result.disclosure} />
        </section>
      ) : null}

      <div className="dpm-copilot-action-grid">
        {actions.map((action) => (
          <section key={action.key} className="dpm-copilot-action-card">
            <div>
              <strong>{action.label}</strong>
              <span>{action.detail}</span>
            </div>
            <MetricRow label="Reference" value={action.reference ?? "Not available"} />
            <MetricRow
              label="Readiness"
              value={action.blockedReason ? action.blockedReason : "Available to prepare"}
            />
            <ActionButton
              priority={action.blockedReason ? "quiet" : "secondary"}
              disabled={Boolean(action.blockedReason) || Boolean(actionState.pending)}
              onClick={() => void runAction(action)}
              aria-label={`Prepare ${action.label}`}
            >
              {actionState.pending === action.key ? "Preparing" : "Prepare"}
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
