import { Alert, CircularProgress } from "@mui/material";

import { ActionButton, SectionBlock, SemanticBadge } from "@/design-system";

import type { IntakeReviewProjection } from "../draft";
import type { IntakeReceipt } from "../receipt";
import styles from "../intake-workspace.module.css";
import { IntakeRecordPreview } from "./intake-record-preview";

export function IntakeReviewRail({
  hasDraft,
  isPreparing,
  issueCount,
  reviewedProjection,
  submissionState,
  submissionError,
  receipt,
  onReview,
  onSubmit,
  onEdit,
  onStartAnother,
}: {
  hasDraft: boolean;
  isPreparing: boolean;
  issueCount: number;
  reviewedProjection: IntakeReviewProjection | null;
  submissionState: "idle" | "submitting" | "error" | "accepted";
  submissionError: string | null;
  receipt: IntakeReceipt | null;
  onReview: () => void;
  onSubmit: () => void;
  onEdit: () => void;
  onStartAnother: () => void;
}) {
  return (
    <SectionBlock
      className={styles.reviewPanel}
      title="Request control"
      subtitle="Validate, review, then publish once."
    >
      <div className={styles.reviewStack}>
        {!hasDraft ? (
          <div className={styles.stateBanner}>
            <strong>No request started</strong>
            <span>Choose an intake action. No data is prepared or sent until you review and publish it.</span>
          </div>
        ) : null}

        {hasDraft && !reviewedProjection && !receipt ? (
          <>
            <div className={styles.stateBanner}>
              <strong>
                {isPreparing ? "Preparing selected file" : issueCount === 0 ? "Ready for review" : "Information required"}
              </strong>
              <span>
                {isPreparing
                  ? "The previous file is retired while the replacement is parsed and checked."
                  : issueCount === 0
                  ? "All required information is present. Review the exact request before publication."
                  : `${issueCount} validation ${issueCount === 1 ? "issue" : "issues"} must be resolved.`}
              </span>
            </div>
            <div className={styles.reviewActions}>
              <ActionButton priority="primary" onClick={onReview} disabled={isPreparing}>
                {isPreparing ? "Preparing file" : "Review request"}
              </ActionButton>
              {isPreparing ? <CircularProgress size={20} aria-label="Preparing selected file" /> : null}
            </div>
          </>
        ) : null}

        {reviewedProjection && !receipt ? (
          <>
            <div className={`${styles.stateBanner} ${styles.stateBannerReady}`}>
              <strong>Reviewed request</strong>
              <span>The request below is the exact payload held for publication and retry.</span>
            </div>
            <div className={styles.reviewHeading}>
              <strong>{reviewedProjection.title}</strong>
              <p>{reviewedProjection.description}</p>
            </div>
            <dl className={styles.reviewFacts}>
              {reviewedProjection.facts.map((fact) => (
                <div className={styles.factRow} key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
            {reviewedProjection.previewSections?.length ? (
              <IntakeRecordPreview sections={reviewedProjection.previewSections} />
            ) : null}
            {submissionError ? <Alert severity="error">{submissionError}</Alert> : null}
            <p className={styles.reviewNote}>
              Publishing confirms these details are correct. Any edit invalidates this review.
            </p>
            <div className={styles.reviewActions}>
              <ActionButton onClick={onEdit} disabled={submissionState === "submitting"}>
                Edit request
              </ActionButton>
              <ActionButton
                priority="primary"
                onClick={onSubmit}
                disabled={submissionState === "submitting"}
              >
                {submissionState === "error" ? "Retry publication" : "Publish reviewed request"}
              </ActionButton>
              {submissionState === "submitting" ? <CircularProgress size={20} aria-label="Publishing request" /> : null}
            </div>
          </>
        ) : null}

        {receipt ? (
          <>
            <div className={`${styles.stateBanner} ${styles.stateBannerSuccess}`}>
              <strong>{receipt.title}</strong>
              <span>{receipt.description}</span>
            </div>
            <SemanticBadge tone="success" emphasis="strong">
              Source confirmed
            </SemanticBadge>
            <dl className={styles.receiptCounts}>
              {receipt.counts.map((count) => (
                <div className={styles.factRow} key={count.label}>
                  <dt>{count.label}</dt>
                  <dd>{count.value}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.receiptEvidence}>
              <span className={styles.evidenceNote}>Gateway evidence</span>
              <code>{`Correlation ${receipt.correlationId}`}</code>
              <code>{`Contract ${receipt.contractVersion}`}</code>
            </div>
            <div className={styles.reviewActions}>
              <ActionButton priority="primary" onClick={onStartAnother}>
                Start another request
              </ActionButton>
            </div>
          </>
        ) : null}
      </div>
    </SectionBlock>
  );
}
