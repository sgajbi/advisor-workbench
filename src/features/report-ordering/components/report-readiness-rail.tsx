"use client";

import { ActionButton, DefinitionList, Panel, SemanticBadge } from "@/design-system";

import type { ReportJobHandle } from "../contracts";
import type { ReportOrderingViewModel } from "../view-model";
import styles from "../report-ordering-workspace.module.css";

export function ReportReadinessRail({
  model,
  preflightReviewed,
  submissionState,
  submissionError,
  submittedHandle,
  onReview,
  onSubmit,
}: {
  model: ReportOrderingViewModel | null;
  preflightReviewed: boolean;
  submissionState: "idle" | "submitting" | "accepted" | "error";
  submissionError: string | null;
  submittedHandle: ReportJobHandle | null;
  onReview: () => void;
  onSubmit: () => void;
}) {
  const tone = !model || model.readiness.state === "blocked" ? "warn" : "success";
  const selectedSections = model?.sectionChoices.filter((section) => section.selected) ?? [];
  const selectedOutput = model?.outputChoices.find(
    (output) => output.id === model.configuration.outputFormat,
  );

  return (
    <div className={styles.readinessStack}>
      <Panel className={styles.readinessPanel} density="compact">
        <div className={styles.railHeading}>
          <div>
            <span className={styles.eyebrow}>Request readiness</span>
            <h2>{model?.readiness.title ?? "Loading report readiness"}</h2>
          </div>
          <SemanticBadge tone={tone} emphasis="strong">
            {model?.readiness.state === "ready" ? "Ready" : "Review"}
          </SemanticBadge>
        </div>
        <p>{model?.readiness.detail ?? "Checking approved report choices and portfolio access."}</p>

        {model?.readiness.issues.length ? (
          <div className={styles.validationSummary} role="alert">
            <strong>Complete before review</strong>
            <ul>
              {model.readiness.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {model ? (
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

        <div className={styles.actionStack}>
          <ActionButton priority="secondary" onClick={onReview} disabled={!model?.canSubmit}>
            {preflightReviewed ? "Reviewed" : "Review Request"}
          </ActionButton>
          <ActionButton
            priority="primary"
            onClick={onSubmit}
            disabled={!preflightReviewed || submissionState === "submitting"}
          >
            {submissionState === "submitting" ? "Submitting…" : "Submit Report Request"}
          </ActionButton>
          {!preflightReviewed && model?.canSubmit ? (
            <small>Review the current setup before submitting.</small>
          ) : null}
        </div>
      </Panel>

      <Panel className={styles.boundaryPanel} density="compact" surface="secondary">
        <span className={styles.eyebrow}>Client release</span>
        <h3>Review before any client use</h3>
        <p>{model?.clientReleaseLabel ?? "Client release posture is loading."}</p>
        <div className={styles.boundarySteps} aria-label="Report lifecycle boundaries">
          <span>Request</span>
          <span>Report data</span>
          <span>Archive</span>
          <span>Client delivery</span>
        </div>
      </Panel>

      {submissionError ? (
        <Panel className={styles.submissionState} density="compact" role="alert">
          <SemanticBadge tone="danger">Not accepted</SemanticBadge>
          <strong>Report request needs attention</strong>
          <p>{submissionError}</p>
        </Panel>
      ) : null}

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
