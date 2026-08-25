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

export default function ProposalMemoPosturePanel({
  proposalId,
  currentVersionNo,
}: Props) {
  const versionNo = currentVersionNo ?? null;
  const [actorReference, setActorReference] = useState("");
  const [reviewRationale, setReviewRationale] = useState("");
  const [audience, setAudience] =
    useState<ProposalMemoProjectionAudience>("ADVISOR");
  const [pendingAction, setPendingAction] = useState<PendingMemoAction | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
    enabled: versionNo !== null,
  });
  const lineageQuery = useQuery({
    queryKey: ["proposal-memo-lineage", proposalId],
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

  const posture = useMemo(
    () =>
      buildProposalMemoPostureModel({
        lineageData: lineageQuery.data,
        memoData: memoQuery.data,
        projectionData: projectionQuery.data,
        replayData: replayQuery.data,
        selectedAudience: audience,
      }),
    [
      audience,
      lineageQuery.data,
      memoQuery.data,
      projectionQuery.data,
      replayQuery.data,
    ],
  );

  const sourceUnavailable = Boolean(
    memoQuery.error ||
    projectionQuery.error ||
    lineageQuery.error ||
    replayQuery.error,
  );
  const sourceLoading = Boolean(
    versionNo !== null &&
    (memoQuery.isPending ||
      projectionQuery.isPending ||
      lineageQuery.isPending ||
      replayQuery.isPending),
  );
  const actorEntered = actorReference.trim().length > 0;

  async function refreshMemoState(): Promise<ProposalMemoRefreshEvidence> {
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
      projection: projectionResult.data,
      lineage: lineageResult.data,
      replay: replayResult.data,
      selectedAudience: audience,
    };
  }

  async function handleCreateMemo() {
    if (versionNo === null || !actorEntered) {
      return;
    }
    await runMemoAction("create", async (markSourceActionCompleted) => {
      const action = await createProposalMemo(
        proposalId,
        versionNo,
        buildCreateMemoPayload(actorReference),
        buildMemoActionIdempotencyKey({
          proposalId,
          versionNo,
          operation: "create",
        }),
      );
      markSourceActionCompleted();
      const refreshed = await refreshMemoState();
      confirmMemoCreateRefresh({ action, refreshed });
      setActionMessage(
        `Advisor memo confirmed for proposal version ${versionNo}.`,
      );
    });
  }

  async function handleReviewMemo() {
    if (
      versionNo === null ||
      !actorEntered ||
      !posture.canRecordReview ||
      !posture.memoHash ||
      !reviewRationale.trim()
    ) {
      return;
    }
    await runMemoAction("review", async (markSourceActionCompleted) => {
      const action = await reviewProposalMemo(
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
      );
      markSourceActionCompleted();
      const refreshed = await refreshMemoState();
      confirmMemoReviewRefresh({ action, refreshed });
      setReviewRationale("");
      setActionMessage(
        `Advisor review confirmed for proposal version ${versionNo}.`,
      );
    });
  }

  async function handleRequestDiscussionMaterial() {
    if (
      versionNo === null ||
      !actorEntered ||
      !posture.canRequestReportPackage ||
      !posture.memoHash
    ) {
      return;
    }
    await runMemoAction("report", async (markSourceActionCompleted) => {
      const action = await requestProposalMemoReportPackage(
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
      );
      markSourceActionCompleted();
      const refreshed = await refreshMemoState();
      confirmMemoReportPackageRefresh({ action, refreshed });
      setActionMessage(
        `Discussion material confirmed for proposal version ${versionNo}.`,
      );
    });
  }

  async function handleRequestCommentary() {
    if (
      versionNo === null ||
      !actorEntered ||
      !posture.canRequestCommentary ||
      !posture.memoHash
    ) {
      return;
    }
    await runMemoAction("commentary", async (markSourceActionCompleted) => {
      const action = await requestProposalMemoAdvisorCommentary(
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
      );
      markSourceActionCompleted();
      const refreshed = await refreshMemoState();
      confirmMemoCommentaryRefresh({ action, refreshed });
      setActionMessage(
        `Advisor commentary confirmed for proposal version ${versionNo}.`,
      );
    });
  }

  async function runMemoAction(
    action: PendingMemoAction,
    operation: (markSourceActionCompleted: () => void) => Promise<void>,
  ) {
    setPendingAction(action);
    setActionError(null);
    setActionMessage(null);
    let sourceActionCompleted = false;
    try {
      await operation(() => {
        sourceActionCompleted = true;
      });
    } catch {
      setActionError(
        sourceActionCompleted
          ? REFRESH_FAILURE_COPY[action]
          : ACTION_FAILURE_COPY[action],
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <SectionBlock
      className={styles.panel}
      title="Advisor memo and evidence pack"
      subtitle="Prepare the working memo, record advisor review, then request material for the client discussion."
      actions={
        <SemanticBadge
          tone={posture.sourceEvidenceAligned ? "success" : "warn"}
        >
          {posture.statusLabel}
        </SemanticBadge>
      }
    >
      {versionNo === null ? (
        <Alert severity="warning">
          A current proposal version is required before memo evidence can be
          prepared or reviewed.
        </Alert>
      ) : null}
      {sourceUnavailable ? (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => void refreshMemoState().catch(() => undefined)}
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
      {actionError ? (
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
        <Text variant="eyebrow">Next action</Text>
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
              placeholder="Enter the advisor or reviewer reference"
              autoComplete="off"
            />
          </label>
          <label className={styles.reviewerField}>
            <Text variant="label">Audience view</Text>
            <select
              className="input"
              value={audience}
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
                pendingAction !== null
              }
              onClick={() => void handleCreateMemo()}
            >
              {pendingAction === "create"
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
                pendingAction !== null
              }
              onClick={() => void handleReviewMemo()}
            >
              {pendingAction === "review"
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
                pendingAction !== null
              }
              onClick={() => void handleRequestDiscussionMaterial()}
            >
              {pendingAction === "report"
                ? "Requesting material…"
                : "Request discussion material"}
            </Button>
          ) : null}
          {posture.canRequestCommentary ? (
            <Button
              type="button"
              variant="outlined"
              disabled={
                !actorEntered || sourceLoading || pendingAction !== null
              }
              onClick={() => void handleRequestCommentary()}
            >
              {pendingAction === "commentary"
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
    </SectionBlock>
  );
}

function requireVersion(versionNo: number | null): number {
  if (versionNo === null) {
    throw new Error("A current proposal version is required.");
  }
  return versionNo;
}
