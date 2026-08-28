"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button } from "@mui/material";

import {
  createProposalMemo,
  getProposalMemo,
  getProposalMemoLineage,
  getProposalMemoProjection,
  getProposalMemoReplayEvidence,
  requestProposalMemoAdvisorCommentary,
  requestProposalMemoReportPackage,
  reviewProposalMemo,
} from "../api";
import { formatProposalEvidenceHash } from "../proposal-evidence-formatters";
import {
  buildAdvisorCommentaryPayload,
  buildApproveMemoPayload,
  buildCreateMemoPayload,
  buildMemoActionIdempotencyKey,
  buildMemoReportPackagePayload,
} from "../proposal-memo-action-payloads";
import {
  buildProposalMemoPostureModel,
  confirmMemoCommentaryRefresh,
  confirmMemoCreateRefresh,
  confirmMemoReportPackageRefresh,
  confirmMemoReviewRefresh,
  PROPOSAL_MEMO_PROJECTION_AUDIENCE_LABELS,
  PROPOSAL_MEMO_PROJECTION_AUDIENCES,
  type ProposalMemoProjectionAudience,
  type ProposalMemoRefreshEvidence,
} from "../proposal-memo-posture-view-model";
import {
  isProposalMemoSourceConfirmedAbsent,
  resolveProposalMemoSourceState,
} from "../proposal-memo-source-state";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import {
  SectionBlock,
  SemanticBadge,
  SupportDetails,
  Text,
  WorkbenchStatusStrip,
} from "@/design-system";
import styles from "./proposal-review-panel.module.css";

type Props = {
  proposalId: string;
  currentVersionNo?: number | null;
};

type PendingMemoAction = "create" | "review" | "report" | "commentary";

type PendingMemoActionState = {
  kind: PendingMemoAction | "refresh";
  versionNo: number;
};

type PendingMemoConfirmation = (
  | {
      kind: "create";
      result: Awaited<ReturnType<typeof createProposalMemo>>;
    }
  | {
      kind: "review";
      result: Awaited<ReturnType<typeof reviewProposalMemo>>;
    }
  | {
      kind: "report";
      result: Awaited<ReturnType<typeof requestProposalMemoReportPackage>>;
    }
  | {
      kind: "commentary";
      result: Awaited<ReturnType<typeof requestProposalMemoAdvisorCommentary>>;
    }
) & {
  selectedAudience: ProposalMemoProjectionAudience;
  versionNo: number;
};

const ACTION_FAILURE_COPY: Record<PendingMemoAction, string> = {
  create:
    "The advisor memo was not prepared. Recheck the advisor reference and try again.",
  review:
    "Advisor review was not recorded. Recheck the rationale and reviewer reference, then try again.",
  report:
    "Discussion material was not requested. Confirm the advisor review and try again.",
  commentary:
    "Advisor commentary was not requested. Confirm the advisor review and try again.",
};

const REFRESH_FAILURE_COPY: Record<PendingMemoAction, string> = {
  create:
    "The memo request completed, but the current evidence record could not confirm it. Refresh before taking another action.",
  review:
    "The review was submitted, but the current memo evidence could not confirm it. Refresh before taking another action.",
  report:
    "The material request was submitted, but the current memo record could not confirm it. Refresh before retrying.",
  commentary:
    "The commentary request was submitted, but the current memo record could not confirm it. Refresh before retrying.",
};

const ACTION_SUCCESS_COPY: Record<
  PendingMemoAction,
  (versionNo: number) => string
> = {
  create: (versionNo) =>
    `Advisor memo confirmed for proposal version ${versionNo}.`,
  review: (versionNo) =>
    `Advisor review confirmed for proposal version ${versionNo}.`,
  report: (versionNo) =>
    `Discussion material confirmed for proposal version ${versionNo}.`,
  commentary: (versionNo) =>
    `Advisor commentary confirmed for proposal version ${versionNo}.`,
};

function confirmPendingMemoRefresh(
  confirmation: PendingMemoConfirmation,
  refreshed: ProposalMemoRefreshEvidence,
): void {
  switch (confirmation.kind) {
    case "create":
      confirmMemoCreateRefresh({ action: confirmation.result, refreshed });
      return;
    case "review":
      confirmMemoReviewRefresh({ action: confirmation.result, refreshed });
      return;
    case "report":
      confirmMemoReportPackageRefresh({
        action: confirmation.result,
        refreshed,
      });
      return;
    case "commentary":
      confirmMemoCommentaryRefresh({
        action: confirmation.result,
        refreshed,
      });
  }
}

export default function ProposalMemoPosturePanel({
  proposalId,
  currentVersionNo,
}: Props) {
  return (
    <ProposalMemoPosturePanelProposalScope
      key={proposalId}
      proposalId={proposalId}
      currentVersionNo={currentVersionNo}
    />
  );
}

function ProposalMemoPosturePanelProposalScope({
  proposalId,
  currentVersionNo,
}: Props) {
  const [pendingAction, setPendingAction] =
    useState<PendingMemoActionState | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingMemoConfirmation | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionStateVersionNo, setActionStateVersionNo] = useState(
    currentVersionNo,
  );

  if (actionStateVersionNo !== currentVersionNo) {
    setActionStateVersionNo(currentVersionNo);
    setActionError(null);
  }

  return (
    <ProposalMemoPosturePanelSession
      key={`${proposalId}:${currentVersionNo ?? "unavailable"}`}
      proposalId={proposalId}
      currentVersionNo={currentVersionNo}
      actionError={actionError}
      confirmationError={confirmationError}
      actionMessage={actionMessage}
      pendingAction={pendingAction}
      pendingConfirmation={pendingConfirmation}
      onActionErrorChange={setActionError}
      onConfirmationErrorChange={setConfirmationError}
      onActionMessageChange={setActionMessage}
      onPendingActionChange={setPendingAction}
      onPendingConfirmationChange={setPendingConfirmation}
    />
  );
}

type SessionProps = Props & {
  actionError: string | null;
  confirmationError: string | null;
  actionMessage: string | null;
  pendingAction: PendingMemoActionState | null;
  pendingConfirmation: PendingMemoConfirmation | null;
  onActionErrorChange: (value: string | null) => void;
  onConfirmationErrorChange: (value: string | null) => void;
  onActionMessageChange: (value: string | null) => void;
  onPendingActionChange: (value: PendingMemoActionState | null) => void;
  onPendingConfirmationChange: (value: PendingMemoConfirmation | null) => void;
};

function ProposalMemoPosturePanelSession({
  proposalId,
  currentVersionNo,
  actionError,
  confirmationError,
  actionMessage,
  pendingAction,
  pendingConfirmation,
  onActionErrorChange: setActionError,
  onConfirmationErrorChange: setConfirmationError,
  onActionMessageChange: setActionMessage,
  onPendingActionChange,
  onPendingConfirmationChange,
}: SessionProps) {
  const versionNo = currentVersionNo ?? null;
  const [actorReference, setActorReference] = useState("");
  const [reviewRationale, setReviewRationale] = useState("");
  const [audience, setAudience] =
    useState<ProposalMemoProjectionAudience>("ADVISOR");

  const memoQuery = useQuery({
    queryKey: ["proposal-memo", proposalId, versionNo],
    queryFn: async () =>
      await getProposalMemo(proposalId, requireVersion(versionNo)),
    ...workbenchStrictQueryDefaults,
    enabled: versionNo !== null,
  });
  const projectionQuery = useQuery({
    queryKey: ["proposal-memo-projection", proposalId, versionNo, audience],
    queryFn: async () =>
      await getProposalMemoProjection(
        proposalId,
        requireVersion(versionNo),
        audience,
    ),
    ...workbenchStrictQueryDefaults,
    placeholderData: (previousData) => previousData,
    enabled: versionNo !== null,
  });
  const lineageQuery = useQuery({
    queryKey: ["proposal-memo-lineage", proposalId, versionNo],
    queryFn: async () => await getProposalMemoLineage(proposalId),
    ...workbenchStrictQueryDefaults,
    enabled: versionNo !== null,
  });
  const replayQuery = useQuery({
    queryKey: ["proposal-memo-replay-evidence", proposalId, versionNo],
    queryFn: async () =>
      await getProposalMemoReplayEvidence(
        proposalId,
        requireVersion(versionNo),
      ),
    ...workbenchStrictQueryDefaults,
    enabled: versionNo !== null,
  });

  const sourceLoading = Boolean(
    versionNo !== null
    && (memoQuery.isPending
      || projectionQuery.isPending
      || lineageQuery.isPending
      || replayQuery.isPending),
  );
  const sourceRefreshing = Boolean(
    versionNo !== null
    && (memoQuery.isFetching
      || projectionQuery.isFetching
      || lineageQuery.isFetching
      || replayQuery.isFetching),
  );
  const sourceConfirmsMemoAbsent = isProposalMemoSourceConfirmedAbsent({
    lineageData: lineageQuery.data,
    lineageError: lineageQuery.error,
    memoData: memoQuery.data,
    memoError: memoQuery.error,
    projectionData: projectionQuery.data,
    projectionError: projectionQuery.error,
    proposalId,
    replayData: replayQuery.data,
    replayError: replayQuery.error,
    versionNo,
  });
  const posture = useMemo(
    () =>
      buildProposalMemoPostureModel({
        lineageData: lineageQuery.data,
        memoData: memoQuery.data,
        proposalId,
        projectionData: projectionQuery.data,
        replayData: replayQuery.data,
        selectedAudience: audience,
        sourceConfirmsMemoAbsent,
        versionNo,
      }),
    [
      audience,
      lineageQuery.data,
      memoQuery.data,
      proposalId,
      projectionQuery.data,
      replayQuery.data,
      sourceConfirmsMemoAbsent,
      versionNo,
    ],
  );
  const sourceEvidenceReadable = Boolean(
    memoQuery.data ||
      projectionQuery.data ||
      lineageQuery.data ||
      replayQuery.data,
  );
  const sourceReadable = Boolean(
    versionNo !== null && !sourceLoading && sourceEvidenceReadable,
  );
  const sourceState = resolveProposalMemoSourceState({
    isChecking: sourceLoading || sourceRefreshing,
    lineageData: lineageQuery.data,
    lineageError: lineageQuery.error,
    memoData: memoQuery.data,
    memoError: memoQuery.error,
    projectionData: projectionQuery.data,
    projectionError: projectionQuery.error,
    proposalId,
    replayData: replayQuery.data,
    replayError: replayQuery.error,
    sourceIdentityCurrent: posture.sourceIdentityCurrent,
    versionNo,
  });
  const sourceUnavailable = sourceState === "unavailable";
  const sourceReady = sourceState === "ready" || sourceState === "not-prepared";
  const actorEntered = actorReference.trim().length > 0;

  async function refreshMemoState(
    targetVersionNo: number,
    targetAudience: ProposalMemoProjectionAudience,
  ): Promise<ProposalMemoRefreshEvidence> {
    if (targetVersionNo !== versionNo || targetAudience !== audience) {
      const [memo, projection, lineage, replay] = await Promise.all([
        getProposalMemo(proposalId, targetVersionNo),
        getProposalMemoProjection(proposalId, targetVersionNo, targetAudience),
        getProposalMemoLineage(proposalId),
        getProposalMemoReplayEvidence(proposalId, targetVersionNo),
      ]);
      return {
        memo,
        proposalId,
        projection,
        lineage,
        replay,
        selectedAudience: targetAudience,
        versionNo: targetVersionNo,
      };
    }

    const [memoResult, projectionResult, lineageResult, replayResult] =
      await Promise.all([
        memoQuery.refetch(),
        projectionQuery.refetch(),
        lineageQuery.refetch(),
        replayQuery.refetch(),
      ]);
    if (
      memoResult.error ||
      projectionResult.error ||
      lineageResult.error ||
      replayResult.error ||
      !memoResult.data ||
      !projectionResult.data ||
      !lineageResult.data ||
      !replayResult.data
    ) {
      throw new Error("MEMO_REFRESH_UNAVAILABLE");
    }
    return {
      memo: memoResult.data,
      proposalId,
      projection: projectionResult.data,
      lineage: lineageResult.data,
      replay: replayResult.data,
      selectedAudience: targetAudience,
      versionNo: targetVersionNo,
    };
  }

  async function handleCreateMemo() {
    if (
      versionNo === null
      || !actorEntered
      || !posture.sourceIdentityCurrent
      || posture.hasMemo
      || pendingAction !== null
      || pendingConfirmation !== null
    ) {
      return;
    }
    await runMemoAction("create", versionNo, async () => ({
      kind: "create",
      result: await createProposalMemo(
        proposalId,
        versionNo,
        buildCreateMemoPayload(actorReference),
        buildMemoActionIdempotencyKey({
          proposalId,
          versionNo,
          operation: "create",
        }),
      ),
      selectedAudience: audience,
      versionNo,
    }));
  }

  async function handleReviewMemo() {
    if (
      versionNo === null ||
      !actorEntered ||
      !posture.canRecordReview ||
      !posture.memoHash ||
      !reviewRationale.trim() ||
      pendingAction !== null ||
      pendingConfirmation !== null
    ) {
      return;
    }
    await runMemoAction(
      "review",
      versionNo,
      async () => ({
        kind: "review",
        result: await reviewProposalMemo(
          proposalId,
          versionNo,
          buildApproveMemoPayload({
            advisorId: actorReference,
            memoHash: posture.memoHash!,
            reviewReason: reviewRationale,
          }),
          buildMemoActionIdempotencyKey({
            proposalId,
            versionNo,
            operation: "review",
          }),
        ),
        selectedAudience: audience,
        versionNo,
      }),
      () => setReviewRationale(""),
    );
  }

  async function handleRequestDiscussionMaterial() {
    if (
      versionNo === null ||
      !actorEntered ||
      !posture.canRequestReportPackage ||
      !posture.memoHash ||
      pendingAction !== null ||
      pendingConfirmation !== null
    ) {
      return;
    }
    await runMemoAction("report", versionNo, async () => ({
      kind: "report",
      result: await requestProposalMemoReportPackage(
        proposalId,
        versionNo,
        buildMemoReportPackagePayload({
          advisorId: actorReference,
          memoHash: posture.memoHash!,
        }),
        buildMemoActionIdempotencyKey({
          proposalId,
          versionNo,
          operation: "report-package",
        }),
      ),
      selectedAudience: audience,
      versionNo,
    }));
  }

  async function handleRequestCommentary() {
    if (
      versionNo === null ||
      !actorEntered ||
      !posture.canRequestCommentary ||
      !posture.memoHash ||
      pendingAction !== null ||
      pendingConfirmation !== null
    ) {
      return;
    }
    await runMemoAction("commentary", versionNo, async () => ({
      kind: "commentary",
      result: await requestProposalMemoAdvisorCommentary(
        proposalId,
        versionNo,
        buildAdvisorCommentaryPayload({
          advisorId: actorReference,
          memoHash: posture.memoHash!,
        }),
        buildMemoActionIdempotencyKey({
          proposalId,
          versionNo,
          operation: "advisor-commentary",
        }),
      ),
      selectedAudience: audience,
      versionNo,
    }));
  }

  async function runMemoAction(
    action: PendingMemoAction,
    actionVersionNo: number,
    operation: () => Promise<PendingMemoConfirmation>,
    onConfirmed?: () => void,
  ) {
    onPendingActionChange({ kind: action, versionNo: actionVersionNo });
    setActionError(null);
    setConfirmationError(null);
    setActionMessage(null);
    let confirmation: PendingMemoConfirmation | null = null;
    try {
      confirmation = await operation();
      onPendingConfirmationChange(confirmation);
      const refreshed = await refreshMemoState(
        confirmation.versionNo,
        confirmation.selectedAudience,
      );
      confirmPendingMemoRefresh(confirmation, refreshed);
      onPendingConfirmationChange(null);
      onConfirmed?.();
      setActionMessage(ACTION_SUCCESS_COPY[action](actionVersionNo));
    } catch {
      if (confirmation) {
        setConfirmationError(REFRESH_FAILURE_COPY[action]);
      } else {
        setActionError(ACTION_FAILURE_COPY[action]);
      }
    } finally {
      onPendingActionChange(null);
    }
  }

  async function handleRefreshConfirmation() {
    if (pendingConfirmation === null || pendingAction !== null) {
      return;
    }

    onPendingActionChange({
      kind: "refresh",
      versionNo: pendingConfirmation.versionNo,
    });
    setConfirmationError(null);
    setActionMessage(null);
    try {
      const refreshed = await refreshMemoState(
        pendingConfirmation.versionNo,
        pendingConfirmation.selectedAudience,
      );
      confirmPendingMemoRefresh(pendingConfirmation, refreshed);
      if (pendingConfirmation.kind === "review") {
        setReviewRationale("");
      }
      setActionMessage(
        ACTION_SUCCESS_COPY[pendingConfirmation.kind](
          pendingConfirmation.versionNo,
        ),
      );
      onPendingConfirmationChange(null);
    } catch {
      setConfirmationError(REFRESH_FAILURE_COPY[pendingConfirmation.kind]);
    } finally {
      onPendingActionChange(null);
    }
  }

  return (
    <SectionBlock
      id="proposal-memo-evidence-pack"
      className={styles.panel}
      title="Advisor memo and evidence pack"
      subtitle="Prepare the working memo, record advisor review, then request material for the client discussion."
      actions={
        <SemanticBadge
          tone={
            pendingConfirmation === null
            && sourceReady
            && posture.sourceEvidenceAligned
              ? "success"
              : "warn"
          }
        >
          {versionNo === null
            ? "Version required"
            : pendingConfirmation !== null
              ? pendingAction?.kind === "refresh" || sourceRefreshing
                ? "Checking record"
                : "Awaiting confirmation"
              : sourceLoading || sourceRefreshing
                ? "Checking evidence"
                : sourceUnavailable
                  ? "Evidence unavailable"
                  : posture.statusLabel}
        </SemanticBadge>
      }
    >
      <div
        data-testid="proposal-memo-source-state"
        data-source-state={sourceState}
        aria-busy={sourceLoading || sourceRefreshing}
      >
        {sourceLoading || sourceRefreshing ? (
          <Alert severity="info">
            Checking the current memo, review and retained evidence before showing
            the next advisor action.
          </Alert>
        ) : null}
      </div>
      {versionNo === null ? (
        <Alert severity="warning">
          A current proposal version is required before memo evidence can be
          prepared or reviewed.
        </Alert>
      ) : null}
      {sourceUnavailable && pendingConfirmation === null ? (
        <Alert
          severity="warning"
          action={
            <Button
              className={styles.confirmationRefreshAction}
              color="inherit"
              size="small"
              onClick={() =>
                void refreshMemoState(
                  requireVersion(versionNo),
                  audience,
                ).catch(() => undefined)
              }
            >
              Refresh record
            </Button>
          }
        >
          Current memo evidence is unavailable. Existing information remains
          visible, but no action will be confirmed until the source record
          refreshes.
        </Alert>
      ) : null}
      {pendingConfirmation !== null
      && (pendingAction === null || pendingAction.kind === "refresh") ? (
        <Alert
          severity="warning"
          role="alert"
          data-testid="proposal-memo-confirmation-recovery"
          data-confirmation-state={
            pendingAction?.kind === "refresh" ? "refreshing" : "awaiting-source"
          }
          action={
            <Button
              className={styles.confirmationRefreshAction}
              color="inherit"
              size="small"
              disabled={pendingAction !== null}
              onClick={() => void handleRefreshConfirmation()}
            >
              {pendingAction?.kind === "refresh"
                ? "Refreshing…"
                : "Refresh record"}
            </Button>
          }
        >
          {confirmationError ?? REFRESH_FAILURE_COPY[pendingConfirmation.kind]}
        </Alert>
      ) : null}
      {actionError && pendingConfirmation === null ? (
        <Alert severity="warning" role="alert">
          {actionError}
        </Alert>
      ) : null}
      {actionMessage ? (
        <Alert
          severity="success"
          role="status"
          data-testid="proposal-memo-action-status"
        >
          {actionMessage}
        </Alert>
      ) : null}

      {sourceReadable ? (
        <>
      <WorkbenchStatusStrip
        label="Advisor memo workflow"
        items={posture.workflowItems}
        className={styles.workflow}
        gridClassName={styles.workflowGrid}
        itemClassName={styles.workflowItem}
        itemLabelClassName={styles.workflowLabel}
        itemBodyClassName={styles.workflowBody}
        itemChipClassName={styles.workflowChip}
        itemSupportClassName={styles.workflowSupport}
      />

      <section
        className={styles.nextAction}
        aria-labelledby="memo-next-action-title"
      >
        <Text variant="eyebrow">Memo next step</Text>
        <Text variant="cardTitle" as="h3" id="memo-next-action-title">
          {posture.nextActionTitle}
        </Text>
        <Text variant="secondary">{posture.nextActionDetail}</Text>
      </section>

      {posture.nextActionKey === "review" ? (
        <label className={styles.rationaleField}>
          <Text variant="label">Advisor review rationale</Text>
          <textarea
            className="textarea"
            rows={3}
            value={reviewRationale}
            onChange={(event) => setReviewRationale(event.target.value)}
            disabled={pendingAction !== null || pendingConfirmation !== null}
            placeholder="Explain why the memo evidence is appropriate for advisor use."
          />
        </label>
      ) : null}

      <SupportDetails
        summary="Memo record details"
        context={`Version ${versionNo ?? "not available"} · ${posture.projectionAudienceLabel} · ${
          actorEntered
            ? "advisor reference entered"
            : "advisor reference required"
        }`}
      >
        <div className={`${styles.recordGrid} ${styles.memoRecordGrid}`}>
          <div className={styles.readOnlyRecord}>
            <Text variant="label">Current proposal version</Text>
            <Text variant="body">{versionNo ?? "Not available"}</Text>
          </div>
          <label className={styles.reviewerField}>
            <Text variant="label">Advisor or reviewer reference</Text>
            <input
              className="input"
                value={actorReference}
                onChange={(event) => setActorReference(event.target.value)}
                disabled={pendingAction !== null || pendingConfirmation !== null}
                placeholder="Enter the advisor or reviewer reference"
              autoComplete="off"
            />
          </label>
          <label className={styles.reviewerField}>
            <Text variant="label">Audience view</Text>
            <select
              className="input"
              value={audience}
              disabled={pendingAction !== null || pendingConfirmation !== null}
              onChange={(event) =>
                setAudience(
                  event.target.value as ProposalMemoProjectionAudience,
                )
              }
            >
              {PROPOSAL_MEMO_PROJECTION_AUDIENCES.map((item) => (
                <option key={item} value={item}>
                  {PROPOSAL_MEMO_PROJECTION_AUDIENCE_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <dl className={`${styles.supportFacts} ${styles.memoSupportFacts}`}>
          <div>
            <dt>Memo evidence</dt>
            <dd>{formatProposalEvidenceHash(posture.memoHash)}</dd>
          </div>
          <div>
            <dt>Recorded activity</dt>
            <dd>
              {posture.eventCount} event{posture.eventCount === 1 ? "" : "s"}
            </dd>
          </div>
          <div>
            <dt>Retained material</dt>
            <dd>{posture.reportArchiveRefsLabel}</dd>
          </div>
          <div>
            <dt>Commentary role</dt>
            <dd>{posture.commentaryAuthorityLabel}</dd>
          </div>
        </dl>
      </SupportDetails>
        </>
      ) : null}

      {sourceReady ? (
        <div className={styles.actionArea}>
        <div className={styles.actionRow}>
          {posture.nextActionKey === "prepare" ? (
            <Button
              type="button"
              variant="contained"
              disabled={
                !actorEntered ||
                 versionNo === null ||
                 sourceLoading ||
                 pendingAction !== null ||
                 pendingConfirmation !== null
               }
              onClick={() => void handleCreateMemo()}
            >
              {pendingAction?.kind === "create"
                ? "Preparing memo…"
                : "Prepare advisor memo"}
            </Button>
          ) : null}
          {posture.nextActionKey === "review" ? (
            <Button
              type="button"
              variant="contained"
              disabled={
                !actorEntered ||
                !reviewRationale.trim() ||
                 !posture.canRecordReview ||
                 sourceLoading ||
                 pendingAction !== null ||
                 pendingConfirmation !== null
               }
              onClick={() => void handleReviewMemo()}
            >
              {pendingAction?.kind === "review"
                ? "Recording review…"
                : "Record advisor review"}
            </Button>
          ) : null}
          {posture.nextActionKey === "report" ? (
            <Button
              type="button"
              variant="contained"
              disabled={
                !actorEntered ||
                 !posture.canRequestReportPackage ||
                 sourceLoading ||
                 pendingAction !== null ||
                 pendingConfirmation !== null
               }
              onClick={() => void handleRequestDiscussionMaterial()}
            >
              {pendingAction?.kind === "report"
                ? "Requesting material…"
                : "Request discussion material"}
            </Button>
          ) : null}
          {posture.canRequestCommentary ? (
            <Button
              type="button"
              variant="outlined"
              disabled={
                !actorEntered ||
                sourceLoading ||
                pendingAction !== null ||
                pendingConfirmation !== null
              }
              onClick={() => void handleRequestCommentary()}
            >
              {pendingAction?.kind === "commentary"
                ? "Requesting review aid…"
                : posture.commentaryRecorded
                  ? "Refresh advisor commentary"
                  : "Request advisor commentary"}
            </Button>
          ) : null}
        </div>
        <Text variant="metadata" className={styles.actionSupport}>
          Discussion material and commentary remain advisor working aids. Client
          release, delivery, suitability approval and implementation are
          separate controlled steps.
        </Text>
        </div>
      ) : null}
    </SectionBlock>
  );
}

function requireVersion(versionNo: number | null): number {
  if (versionNo === null) {
    throw new Error("A current proposal version is required.");
  }
  return versionNo;
}
