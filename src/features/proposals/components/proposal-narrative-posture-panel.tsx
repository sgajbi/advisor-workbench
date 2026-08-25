"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button } from "@mui/material";

import {
  createProposalReportRequest,
  getProposalDeliveryEvents,
  getProposalDeliverySummary,
  getProposalNarrativeReviewEvidence,
  reviewProposalNarrative,
} from "../api";
import {
  buildProposalNarrativePostureModel,
  confirmDiscussionPackRefresh,
  confirmNarrativeReviewRefresh,
} from "../proposal-narrative-posture-view-model";
import { formatProposalEvidenceHash } from "../proposal-evidence-formatters";
import { buildProposalActionIdempotencyKey } from "../proposal-workflow-copy";
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

export default function ProposalNarrativePosturePanel({
  proposalId,
  currentVersionNo,
}: Props) {
  return (
    <ProposalNarrativePosturePanelSession
      key={`${proposalId}:${currentVersionNo ?? "unavailable"}`}
      proposalId={proposalId}
      currentVersionNo={currentVersionNo}
    />
  );
}

function ProposalNarrativePosturePanelSession({
  proposalId,
  currentVersionNo,
}: Props) {
  const versionNo = currentVersionNo ?? null;
  const [reviewedBy, setReviewedBy] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["proposal-delivery-summary", proposalId],
    queryFn: async () => await getProposalDeliverySummary(proposalId),
    ...workbenchStrictQueryDefaults,
  });
  const eventsQuery = useQuery({
    queryKey: ["proposal-delivery-events", proposalId],
    queryFn: async () => await getProposalDeliveryEvents(proposalId),
    ...workbenchStrictQueryDefaults,
  });
  const narrativeReviewQuery = useQuery({
    queryKey: ["proposal-narrative-review-evidence", proposalId, versionNo],
    queryFn: async () => {
      if (versionNo === null) {
        return null;
      }
      return await getProposalNarrativeReviewEvidence(proposalId, versionNo);
    },
    enabled: versionNo !== null,
    ...workbenchStrictQueryDefaults,
  });

  const posture = useMemo(
    () =>
      buildProposalNarrativePostureModel({
        proposalId,
        versionNo,
        review: narrativeReviewQuery.data,
        summary: summaryQuery.data,
        events: eventsQuery.data,
      }),
    [
      eventsQuery.data,
      narrativeReviewQuery.data,
      proposalId,
      summaryQuery.data,
      versionNo,
    ],
  );

  const canSubmit =
    versionNo !== null &&
    reviewedBy.trim().length > 0 &&
    reviewReason.trim().length > 0;

  async function handleApproveNarrative() {
    if (
      versionNo === null ||
      reviewedBy.trim().length === 0 ||
      reviewReason.trim().length === 0
    ) {
      return;
    }
    setPendingAction("review");
    setActionError(null);
    setActionMessage(null);
    let reviewRecorded = false;
    try {
      const data = await reviewProposalNarrative(
        proposalId,
        versionNo,
        {
          action: "APPROVE",
          reviewed_by: reviewedBy.trim(),
          reason: reviewReason.trim(),
          client_ready_release_requested: false,
        },
        buildProposalActionIdempotencyKey(
          proposalId,
          `narrative-review-${versionNo}`,
        ),
      );
      reviewRecorded = true;
      const narrativeRefresh = narrativeReviewQuery.refetch();
      void Promise.allSettled([
        summaryQuery.refetch(),
        eventsQuery.refetch(),
      ]);
      const narrativeResult = await narrativeRefresh;
      if (narrativeResult.error) {
        throw new Error("REFRESH_UNAVAILABLE");
      }
      confirmNarrativeReviewRefresh({
        proposalId,
        versionNo,
        review: data,
        refreshedReview: narrativeResult.data ?? undefined,
      });
      setReviewReason("");
      setActionMessage(
        `Advisor review confirmed for proposal version ${versionNo}.`,
      );
    } catch {
      setActionError(
        reviewRecorded
          ? "The review was submitted, but current proposal evidence could not confirm it. Refresh before taking another action."
          : "Advisor review was not recorded. Recheck the rationale and reviewer reference, then try again.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRequestReport() {
    if (
      versionNo === null ||
      !posture.canRequestDiscussionPack ||
      reviewedBy.trim().length === 0
    ) {
      return;
    }
    setPendingAction("report");
    setActionError(null);
    setActionMessage(null);
    let requestRecorded = false;
    try {
      const data = await createProposalReportRequest(proposalId, {
        report_type: "PORTFOLIO_REVIEW",
        requested_by: reviewedBy.trim(),
        related_version_no: versionNo,
        include_execution_summary: true,
        include_reviewed_narrative: true,
      });
      requestRecorded = true;
      const [summaryResult, eventsResult] = await Promise.all([
        summaryQuery.refetch(),
        eventsQuery.refetch(),
      ]);
      if (summaryResult.error || eventsResult.error) {
        throw new Error("REFRESH_UNAVAILABLE");
      }
      confirmDiscussionPackRefresh({
        proposalId,
        versionNo,
        report: data,
        summary: summaryResult.data,
        events: eventsResult.data,
      });
      setActionMessage(
        `Discussion-pack request confirmed for proposal version ${versionNo}.`,
      );
    } catch {
      setActionError(
        requestRecorded
          ? "The discussion-pack request was submitted, but current preparation status could not confirm it. Refresh before retrying."
          : "The discussion-pack request was not recorded. Confirm the reviewed rationale and reviewer reference, then try again.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <SectionBlock
      id="proposal-narrative-review"
      className={styles.panel}
      title="Narrative review and discussion pack"
      subtitle="Confirm the recommendation rationale, record advisor review, then request client-discussion material."
      actions={
        <SemanticBadge tone={posture.reviewTone}>
          {posture.reviewState}
        </SemanticBadge>
      }
    >
      {summaryQuery.error || eventsQuery.error || narrativeReviewQuery.error ? (
        <Alert severity="warning">
          Current discussion-pack or delivery status is unavailable. Existing
          proposal evidence remains visible, but no new action will be confirmed
          until the record refreshes.
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
          data-testid="proposal-narrative-action-status"
        >
          {actionMessage}
        </Alert>
      ) : null}

      <WorkbenchStatusStrip
        label="Narrative review workflow"
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
        aria-labelledby="narrative-next-action-title"
      >
        <Text variant="eyebrow">Next action</Text>
        <Text variant="cardTitle" as="h3" id="narrative-next-action-title">
          {posture.nextActionTitle}
        </Text>
        <Text variant="secondary">{posture.nextActionDetail}</Text>
      </section>

      <label className={styles.rationaleField}>
        <Text variant="label">Advisor review rationale</Text>
        <textarea
          className="textarea"
          rows={3}
          value={reviewReason}
          onChange={(event) => setReviewReason(event.target.value)}
          placeholder="Explain why the recommendation is appropriate for advisor use."
        />
      </label>

      <SupportDetails
        summary="Review record details"
        context={`Version ${versionNo ?? "not available"} · ${reviewedBy ? "reviewer reference entered" : "reviewer reference required"}`}
      >
        <div className={styles.recordGrid}>
          <div className={styles.readOnlyRecord}>
            <Text variant="label">Current proposal version</Text>
            <Text variant="body">{versionNo ?? "Not available"}</Text>
          </div>
          <label className={styles.reviewerField}>
            <Text variant="label">Reviewer reference</Text>
            <input
              className="input"
              value={reviewedBy}
              onChange={(event) => setReviewedBy(event.target.value)}
              placeholder="Enter the advisor or reviewer reference"
              autoComplete="off"
            />
          </label>
        </div>
        <dl className={styles.supportFacts}>
          <div>
            <dt>Rationale evidence</dt>
            <dd>{formatProposalEvidenceHash(posture.sourceNarrativeHash)}</dd>
          </div>
          <div>
            <dt>Review policy</dt>
            <dd>{posture.policyVersion ?? "Not reported"}</dd>
          </div>
          <div>
            <dt>Latest delivery activity</dt>
            <dd>{posture.latestEventTime ?? "Not recorded"}</dd>
          </div>
        </dl>
      </SupportDetails>

      <div className={styles.actionArea}>
        <div className={styles.actionRow}>
          <Button
            type="button"
            variant="contained"
            disabled={!canSubmit || pendingAction !== null}
            onClick={() => void handleApproveNarrative()}
          >
            {pendingAction === "review"
              ? "Recording review…"
              : "Record advisor review"}
          </Button>
          <Button
            type="button"
            variant="outlined"
            disabled={
              pendingAction !== null ||
              !posture.canRequestDiscussionPack ||
              reviewedBy.trim().length === 0 ||
              versionNo === null
            }
            onClick={() => void handleRequestReport()}
          >
            {pendingAction === "report"
              ? "Requesting discussion pack…"
              : "Request discussion pack"}
          </Button>
        </div>
        <Text variant="metadata" className={styles.actionSupport}>
          A discussion pack becomes available only after this proposal version
          has confirmed advisor-review evidence. Client release, document
          delivery and implementation remain separate controlled steps.
        </Text>
      </div>
    </SectionBlock>
  );
}
