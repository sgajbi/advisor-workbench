"use client";

import { useMemo, useRef, useState } from "react";

import {
  ActionButton,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
  useAdmittedSourceSelection,
  WorkbenchWorklist,
  type WorkbenchWorklistItem,
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
import { useManageProofPackState } from "@/features/workbench/manage-proof-pack-state";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";

import styles from "./dpm-copilot-workspace.module.css";

type CopilotAction = WorkbenchWorklistItem<DpmAiWorkflowFamily> & {
  key: DpmAiWorkflowFamily;
  contextKey: string;
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
  const sharedProofPackState = useManageProofPackState();
  const currentProofPack = sharedProofPackState?.proofPack ?? data.proofPack;
  const [actionState, setActionState] = useState<ActionState>({
    pending: null,
    result: null,
    error: null,
  });
  const requestSequenceRef = useRef(0);
  const actions = useMemo(
    () =>
      buildCopilotActions({
        data,
        currentProofPack,
        portfolioId,
        mandateId: mandateId ?? null,
      }),
    [currentProofPack, data, mandateId, portfolioId],
  );
  const currentContextKeys = useMemo(
    () => new Set(actions.map((action) => action.contextKey)),
    [actions],
  );
  const pending =
    actionState.pending &&
    currentContextKeys.has(actionState.pending.contextKey)
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
  const selectionScopeKey = JSON.stringify([portfolioId, mandateId ?? null]);
  const [selectedKey, setSelectedKey] = useAdmittedSourceSelection({
    scopeKey: selectionScopeKey,
    admittedKeys: actions.map((action) => action.key),
    sourceResolved: true,
  });
  const selectedAction =
    actions.find((action) => action.key === selectedKey) ?? actions[0];

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
          outcome: buildDpmAiWorkflowOutcome(
            action.key,
            response,
            action.reference ?? "",
          ),
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
            message:
              error instanceof Error ? error.message : `${action.title} failed.`,
        },
      });
    }
  }

  return (
    <SectionBlock
      title="Decision-support workflows"
      subtitle="Choose a workflow, confirm its portfolio evidence, then prepare material for human review."
      className={styles.workspace}
      id="pm-copilot-workspace"
      actions={
        <div
          className={styles.workspaceStatus}
          aria-label="Portfolio manager copilot status"
        >
          <SemanticBadge tone={readyCount > 0 ? "success" : "warn"}>
            {readyCount} of {actions.length} available
          </SemanticBadge>
        </div>
      }
    >
      {selectedAction ? (
        <WorkbenchWorklist
          ariaLabel="Portfolio manager decision-support workflows"
          relationshipIdBase="pm-copilot-workflow"
          eyebrow="Workflow queue"
          title="Select review material to prepare"
          description="Review the source input and availability before preparing material."
          items={actions.map((action) => ({
            ...action,
            status: (
              <SemanticBadge
                tone={copilotActionTone(action, pending, result, error)}
              >
                {copilotActionStatus(action, pending, result, error)}
              </SemanticBadge>
            ),
            facts: [
              {
                label: action.referenceLabel,
                value: action.reference ?? "Not available",
              },
            ],
          }))}
          selectedKey={selectedAction.key}
          onSelectionChange={setSelectedKey}
          decisionLabel="Selected decision-support workflow"
          decision={
            <SelectedCopilotWorkflow
              action={selectedAction}
              pending={pending}
              result={
                result?.contextKey === selectedAction.contextKey
                  ? result.outcome
                  : null
              }
              error={
                error?.contextKey === selectedAction.contextKey
                  ? error.message
                  : null
              }
              onPrepare={() => void runAction(selectedAction)}
            />
          }
          className={styles.decisionWorkspace}
        />
      ) : null}

      <div
        className={styles.operatingBoundary}
        aria-label="Operating boundaries"
      >
        <Text variant="microLabel">Human review required</Text>
        <Text variant="bodySmall">
          Internal decision support only. Portfolio manager and investment
          control retain decision authority; client communication and order
          execution are not supported.
        </Text>
      </div>
    </SectionBlock>
  );
}

function SelectedCopilotWorkflow({
  action,
  pending,
  result,
  error,
  onPrepare,
}: {
  action: CopilotAction;
  pending: ActionState["pending"];
  result: DpmAiWorkflowOutcome | null;
  error: string | null;
  onPrepare: () => void;
}) {
  const isPending = pending?.contextKey === action.contextKey;

  return (
    <article
      className={styles.decisionPanel}
      data-copilot-workflow={action.key}
      data-testid="pm-copilot-selected-workflow"
    >
      <header className={styles.decisionHeader}>
        <Text variant="microLabel">Selected workflow</Text>
        <Text as="h3" variant="subsectionTitle">
          {action.title}
        </Text>
        <Text variant="secondary">{action.detail}</Text>
      </header>

      <dl
        className={styles.decisionFacts}
        aria-label="Selected workflow evidence"
      >
        <div>
          <dt>{action.referenceLabel}</dt>
          <dd>{action.reference ?? "Not available"}</dd>
        </div>
        <div>
          <dt>Readiness</dt>
          <dd>{action.blockedReason ?? "Available to prepare"}</dd>
        </div>
      </dl>

      <div className={styles.decisionAction}>
        <Text variant="bodySmall">
          Prepared material remains review-required and is not approved for
          client use.
        </Text>
        <ActionButton
          priority={action.blockedReason ? "quiet" : "secondary"}
          disabled={Boolean(action.blockedReason) || Boolean(pending)}
          onClick={onPrepare}
          aria-label={
            action.blockedReason
              ? `${action.title} unavailable: ${action.blockedReason}`
              : `Prepare ${action.title}`
          }
        >
          {action.blockedReason
            ? "Unavailable"
            : isPending
              ? "Preparing"
              : "Prepare"}
        </ActionButton>
      </div>

      {error ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Copilot request needs attention"
          body={error}
        />
      ) : null}
      {result ? <DpmAiWorkflowResult outcome={result} focusOnMount /> : null}
    </article>
  );
}

function copilotActionStatus(
  action: CopilotAction,
  pending: ActionState["pending"],
  result: ActionState["result"],
  error: ActionState["error"],
) {
  if (pending?.contextKey === action.contextKey) return "Preparing";
  if (result?.contextKey === action.contextKey) return "Prepared";
  if (error?.contextKey === action.contextKey) return "Needs attention";
  return action.blockedReason ? "Unavailable" : "Available";
}

function copilotActionTone(
  action: CopilotAction,
  pending: ActionState["pending"],
  result: ActionState["result"],
  error: ActionState["error"],
): "default" | "success" | "warn" {
  if (pending?.contextKey === action.contextKey) return "default";
  if (result?.contextKey === action.contextKey) return "success";
  if (error?.contextKey === action.contextKey || action.blockedReason)
    return "warn";
  return "success";
}

function buildCopilotActions({
  data,
  currentProofPack,
  portfolioId,
  mandateId,
}: {
  data: ManageWorkspaceData;
  currentProofPack: ManageWorkspaceData["proofPack"];
  portfolioId: string;
  mandateId: string | null;
}): CopilotAction[] {
  const proofPackModel = buildProofPackPanelModel(currentProofPack);
  const currentProofPackId =
    proofPackModel.proofPackId === "N/A" ? null : proofPackModel.proofPackId;
  const historicalProofPackId = readFirstString(
    firstArrayItem(data.outcomeReviews?.data, "items"),
    ["proof_pack_id"],
  );
  const proofPackReference = currentProofPackId ?? historicalProofPackId;
  const proofPackBlockedReason = resolveProofPackMemoBlockedReason({
    currentProofPackId,
    historicalProofPackId,
    sourceError: data.proofPackError ?? data.outcomeReviewError,
    supportabilityState: proofPackModel.supportabilityState,
    aiEvidenceInputAvailable: proofPackModel.aiEvidenceInputAvailable,
  });
  const waveId = readFirstString(firstArrayItem(data.waves?.data, "items"), [
    "wave_id",
  ]);
  const exceptionId = readFirstString(
    firstArrayItem(data.commandCenterExceptions?.data, "items"),
    ["exception_id"],
  );
  const outcomeReviewId = readFirstString(
    firstArrayItem(data.outcomeReviews?.data, "items"),
    ["outcome_review_id"],
  );
  const scoreRunId =
    readFirstString(
      firstArrayItem(data.pmOperatingQualityScoreRuns?.data, "items"),
      ["score_run_id"],
    ) ??
    readFirstString(data.pmOperatingQualityScoreRuns?.supportability, [
      "score_run_id",
    ]);
  const waveBlockedReason = waveId
    ? null
    : data.wavesError
      ? "Rebalance wave data temporarily unavailable"
      : "No rebalance wave available";
  const exceptionBlockedReason = exceptionId
    ? null
    : data.commandCenterExceptionsError
      ? "Monitoring exceptions temporarily unavailable"
      : "No monitoring exception available";
  const outcomeReviewBlockedReason = outcomeReviewId
    ? null
    : data.outcomeReviewError
      ? "Outcome reviews temporarily unavailable"
      : "No outcome review available";
  const scoreRunBlockedReason = scoreRunId
    ? null
    : data.pmOperatingQualityScoreRunsError
      ? "PM quality evidence temporarily unavailable"
      : "No PM quality score run available";

  const actions: Array<Omit<CopilotAction, "contextKey">> = [
    {
      key: "proof-pack-memo",
      title: "Evidence Pack Decision Memo",
      detail:
        "Prepare a review-required portfolio decision memo from the current evidence pack.",
      referenceLabel: currentProofPackId
        ? "Evidence pack"
        : "Historical evidence pack",
      reference: proofPackReference,
      blockedReason: proofPackBlockedReason,
      run: () =>
        requestDpmProofPackAiPmMemo({ proofPackId: currentProofPackId ?? "" }),
    },
    {
      key: "wave-memo",
      title: "Wave PM Memo",
      detail: "Request PM review commentary for a Manage-owned rebalance wave.",
      referenceLabel: "Reference",
      reference: waveId,
      blockedReason: waveBlockedReason,
      run: () => requestDpmWaveAiPmMemo(waveId ?? ""),
    },
    {
      key: "operations-handoff",
      title: "Operations Handoff Summary",
      detail:
        "Request a support-only handoff summary for operations and investment control.",
      referenceLabel: "Reference",
      reference: waveId,
      blockedReason: waveBlockedReason,
      run: () => requestDpmOperationsHandoffSummary(waveId ?? ""),
    },
    {
      key: "exception-summary",
      title: "Exception Summary",
      detail: "Request triage support over a Manage monitoring exception.",
      referenceLabel: "Reference",
      reference: exceptionId,
      blockedReason: exceptionBlockedReason,
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
      title: "Outcome Narrative",
      detail:
        "Request PM/CIO/control summary over realized outcome-review evidence.",
      referenceLabel: "Reference",
      reference: outcomeReviewId,
      blockedReason: outcomeReviewBlockedReason,
      run: () =>
        requestDpmOutcomeReviewAiNarrative({
          outcomeReviewId: outcomeReviewId ?? "",
        }),
    },
    {
      key: "pm-quality-summary",
      title: "PM Quality Support Summary",
      detail:
        "Request a support-only summary of portfolio-management operating-quality evidence.",
      referenceLabel: "Reference",
      reference: scoreRunId,
      blockedReason: scoreRunBlockedReason,
      run: () =>
        requestDpmPmOperatingQualitySummary({ scoreRunId: scoreRunId ?? "" }),
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
  sourceError,
  supportabilityState,
  aiEvidenceInputAvailable,
}: {
  currentProofPackId: string | null;
  historicalProofPackId: string | null;
  sourceError: string | null;
  supportabilityState: string;
  aiEvidenceInputAvailable: boolean;
}): string | null {
  if (!currentProofPackId) {
    if (sourceError) {
      return "Current evidence pack temporarily unavailable";
    }
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

function firstArrayItem(
  source: unknown,
  key: string,
): Record<string, unknown> | null {
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
