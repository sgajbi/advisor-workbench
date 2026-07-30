"use client";

import { ActionButton, DefinitionList, Panel, SemanticBadge } from "@/design-system";

import type { ReportJobHandle } from "../contracts";
import type { ReportOrderingReadinessState } from "../report-ordering-screen-state";
import type { ReportOrderingViewModel } from "../view-model";
import styles from "../report-ordering-workspace.module.css";

export function ReportReadinessRail({
  model,
  screenState,
  preflightReviewed,
  canSubmitReviewedRequest,
  submissionState,
  submittedHandle,
  onReview,
  onSubmit,
}: {
  model: ReportOrderingViewModel | null;
  screenState: ReportOrderingReadinessState;
  preflightReviewed: boolean;
  canSubmitReviewedRequest: boolean;
  submissionState: "idle" | "submitting" | "accepted" | "error";
  submittedHandle: ReportJobHandle | null;
  onReview: () => void;
  onSubmit: () => void;
}) {
  const selectedSections = model?.sectionChoices.filter((section) => section.selected) ?? [];
  const selectedOutput = model?.outputChoices.find(
    (output) => output.id === model.configuration.outputFormat,
  );
  const validationIssues = screenState.showValidationSummary
    ? model?.readiness.issues ?? []
    : [];

  return (
    <div className={styles.readinessStack}>
      <Panel
        className={styles.readinessPanel}
        density="compact"
        aria-busy={screenState.busy}
      >
        <div
          className={styles.readinessStatus}
          role={screenState.kind === "not_accepted" ? "alert" : "status"}
          aria-live={screenState.kind === "not_accepted" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          <div className={styles.railHeading}>
            <div>
              <span className={styles.eyebrow}>Request readiness</span>
              <h2>{screenState.title}</h2>
            </div>
            <SemanticBadge tone={screenState.tone} emphasis="strong">
              {screenState.badgeLabel}
            </SemanticBadge>
          </div>
          <p>{screenState.detail}</p>
        </div>

        {validationIssues.length ? (
          <div className={styles.validationSummary} role="alert">
            <strong>Complete before review</strong>
            <ul>
              {validationIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {model && screenState.showRequestSummary ? (
          <DefinitionList
            ariaLabel="Report request summary"
            className={styles.readinessFacts}
            items={[
              { label: "Report", value: model.family?.businessLabel ?? "Not selected" },
              { label: "Scope", value: "Selected portfolio" },
              { label: "Report date", value: model.configuration.asOfDate || "Not selected" },
              { label: "Output", value: selectedOutput?.label ?? "Not selected" },
              { label: "Sections", value: `${selectedSections.length} selected` },
              { label: "Audience", value: model.audienceLabel },
            ]}
          />
        ) : null}

        {screenState.showActions ? (
          <div className={styles.actionStack}>
            <ActionButton
              priority="secondary"
              onClick={onReview}
              disabled={!model?.canSubmit || submissionState === "submitting"}
            >
              {preflightReviewed ? "Reviewed" : "Review Request"}
            </ActionButton>
            <ActionButton
              priority="primary"
              onClick={onSubmit}
              disabled={!canSubmitReviewedRequest}
            >
              {submissionState === "submitting"
                ? "Submitting…"
                : submissionState === "error"
                  ? "Retry Report Request"
                  : "Submit Report Request"}
            </ActionButton>
            {!preflightReviewed && model?.canSubmit ? (
              <small>Review the current setup before submitting.</small>
            ) : null}
          </div>
        ) : null}
        <section className={styles.boundarySection} aria-labelledby="report-client-release-title">
          <span className={styles.eyebrow}>Client-use boundary</span>
          <h3 id="report-client-release-title">{screenState.clientReleaseTitle}</h3>
          <p>{screenState.clientReleaseDetail}</p>
          <div className={styles.boundarySteps} aria-label="Separate report lifecycle controls">
            <span>Request</span>
            <span>Report data</span>
            <span>Archive</span>
            <span>Client delivery</span>
          </div>
        </section>
      </Panel>

      {submittedHandle ? (
        <Panel className={styles.submissionState} density="compact" aria-live="polite">
          <SemanticBadge tone="success">Accepted</SemanticBadge>
          <strong>Report request recorded</strong>
          <p>Reporting has accepted the request. This does not mean a document was archived or sent.</p>
          <details className={styles.supportDisclosure}>
            <summary>Support reference</summary>
            <code>{submittedHandle.report_job_id}</code>
          </details>
        </Panel>
      ) : null}
    </div>
  );
}
