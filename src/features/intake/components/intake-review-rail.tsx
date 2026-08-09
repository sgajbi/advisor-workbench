import { Alert, CircularProgress } from "@mui/material";

import { ActionButton, SectionBlock, SemanticBadge } from "@/design-system";

import type { IntakeReviewProjection } from "../draft";
import type { IntakeReceipt } from "../receipt";
import styles from "../intake-workspace.module.css";

export function IntakeReviewRail({
  hasDraft,
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
              <strong>{issueCount === 0 ? "Ready for review" : "Information required"}</strong>
              <span>
                {issueCount === 0
                  ? "All required information is present. Review the exact request before publication."
                  : `${issueCount} validation ${issueCount === 1 ? "issue" : "issues"} must be resolved.`}
              </span>
            </div>
            <div className={styles.reviewActions}>
              <ActionButton priority="primary" onClick={onReview}>
                Review request
              </ActionButton>
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
              <div className={styles.recordPreview} aria-label="Parsed record preview">
                <div className={styles.recordPreviewHeader}>
                  <strong>Parsed record preview</strong>
                  <span>Review each parsed source record before publication.</span>
                </div>
                {reviewedProjection.previewSections.map((section) => (
                  <section className={styles.previewSection} key={section.title}>
                    <h3>{section.title}</h3>
                    <div className={styles.previewRecords}>
                      {section.records.map((record) => (
                        <article className={styles.previewRecord} key={record.title}>
                          <h4>{record.title}</h4>
                          <dl className={styles.previewFacts}>
                            {record.facts.map((fact) => (
                              <div className={styles.factRow} key={fact.label}>
                                <dt>{fact.label}</dt>
                                <dd>{fact.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
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
