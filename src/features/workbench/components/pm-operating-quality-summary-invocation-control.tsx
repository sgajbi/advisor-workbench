"use client";

import { ActionButton, MetricRow, Text } from "@/design-system";
import PmOperatingQualityStateBadge from "@/features/workbench/components/pm-operating-quality-state-badge";
import type {
  PmQualityCommandOption,
  PmQualitySummaryInvocationEvidence,
  PmQualitySummaryInvocationForm,
} from "@/features/workbench/pm-operating-quality-actions";

type Props = {
  form: PmQualitySummaryInvocationForm;
  readiness: { state: string; detail: string };
  previewReady: boolean;
  pendingPreview: boolean;
  pendingCreate: boolean;
  createEvidence: PmQualitySummaryInvocationEvidence | null;
  scoreRunOptions: PmQualityCommandOption[];
  reviewActionOptions: PmQualityCommandOption[];
  onFormChange: (field: keyof PmQualitySummaryInvocationForm, value: string) => void;
  onPreview: () => void;
  onCreate: () => void;
};

export default function PmOperatingQualitySummaryInvocationControl({
  form,
  readiness,
  previewReady,
  pendingPreview,
  pendingCreate,
  createEvidence,
  scoreRunOptions,
  reviewActionOptions,
  onFormChange,
  onPreview,
  onCreate,
}: Props) {
  return (
    <div
      className="pm-quality-review-action-form"
      aria-label="PM operating quality summary-invocation control"
    >
      <div className="pm-quality-card-header">
        <Text as="h3" variant="subsectionTitle">
          Summary Invocation Control
        </Text>
        <PmOperatingQualityStateBadge state={readiness.state} />
      </div>
      <div className="pm-quality-review-action-form-grid">
        <label className="workbench-field-label" htmlFor="pm-quality-summary-requested-by">
          Requested by
          <input
            id="pm-quality-summary-requested-by"
            className="workbench-input"
            value={form.requestedBy}
            onChange={(event) => onFormChange("requestedBy", event.target.value)}
          />
        </label>
        <label className="workbench-field-label" htmlFor="pm-quality-summary-score-run">
          Score run id
          <select
            id="pm-quality-summary-score-run"
            className="workbench-input"
            value={form.scoreRunId}
            onChange={(event) => onFormChange("scoreRunId", event.target.value)}
          >
            {scoreRunOptions.some((option) => option.value === form.scoreRunId) ? null : (
              <option value={form.scoreRunId}>{form.scoreRunId || "Select score run"}</option>
            )}
            {scoreRunOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="workbench-field-label" htmlFor="pm-quality-summary-review-action">
          Review action id
          <select
            id="pm-quality-summary-review-action"
            className="workbench-input"
            value={form.reviewActionId}
            onChange={(event) => onFormChange("reviewActionId", event.target.value)}
          >
            {reviewActionOptions.some((option) => option.value === form.reviewActionId) ? null : (
              <option value={form.reviewActionId}>
                {form.reviewActionId || "Select review action"}
              </option>
            )}
            {reviewActionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="workbench-field-label" htmlFor="pm-quality-summary-state">
          Invocation state
          <select
            id="pm-quality-summary-state"
            className="workbench-input"
            value={form.invocationState}
            onChange={(event) => onFormChange("invocationState", event.target.value)}
          >
            <option value="PENDING_REVIEW">Pending review</option>
            <option value="REVIEW_REQUIRED">Review required</option>
            <option value="RECORDED">Recorded</option>
          </select>
        </label>
        <label className="workbench-field-label" htmlFor="pm-quality-summary-ref">
          Bank summary ref
          <input
            id="pm-quality-summary-ref"
            className="workbench-input"
            value={form.summaryRef}
            onChange={(event) => onFormChange("summaryRef", event.target.value)}
          />
        </label>
        <label className="workbench-field-label" htmlFor="pm-quality-summary-pack-name">
          Workflow pack
          <input
            id="pm-quality-summary-pack-name"
            className="workbench-input"
            value={form.workflowPackName}
            onChange={(event) => onFormChange("workflowPackName", event.target.value)}
          />
        </label>
        <label className="workbench-field-label" htmlFor="pm-quality-summary-pack-version">
          Workflow pack version
          <input
            id="pm-quality-summary-pack-version"
            className="workbench-input"
            value={form.workflowPackVersion}
            onChange={(event) => onFormChange("workflowPackVersion", event.target.value)}
          />
        </label>
        <label className="workbench-field-label" htmlFor="pm-quality-summary-workflow-run">
          Workflow run id
          <input
            id="pm-quality-summary-workflow-run"
            className="workbench-input"
            value={form.workflowRunId}
            onChange={(event) => onFormChange("workflowRunId", event.target.value)}
          />
        </label>
        <label className="workbench-field-label" htmlFor="pm-quality-summary-artifact">
          Artifact ref
          <input
            id="pm-quality-summary-artifact"
            className="workbench-input"
            value={form.artifactRef}
            onChange={(event) => onFormChange("artifactRef", event.target.value)}
          />
        </label>
        <label className="workbench-field-label" htmlFor="pm-quality-summary-content-hash">
          Content hash
          <input
            id="pm-quality-summary-content-hash"
            className="workbench-input"
            value={form.contentHash}
            onChange={(event) => onFormChange("contentHash", event.target.value)}
          />
        </label>
      </div>
      <div
        className="pm-quality-command-readiness"
        aria-label="PM operating quality summary-invocation readiness"
      >
        <MetricRow label="Preview Readiness" value={readiness.detail} />
        <MetricRow
          label="Score-Run Source"
          value={
            scoreRunOptions.find((option) => option.value === form.scoreRunId)?.detail ??
            "No Gateway-returned score run selected"
          }
        />
        <MetricRow
          label="Review-Action Source"
          value={
            reviewActionOptions.find((option) => option.value === form.reviewActionId)?.detail ??
            "No Gateway-returned review action selected"
          }
        />
        <MetricRow
          label="Create Control"
          value={
            previewReady
              ? "Preview available; create records a Manage-owned summary invocation"
              : "Preview required before create"
          }
        />
        <MetricRow
          label="Boundary"
          value="Invocation evidence only; no generated summary text, prompt body, model response, PM ranking, client communication, trade, order, OMS, execution, fills, or settlement action is enabled"
        />
      </div>
      <div className="pm-quality-action-row">
        <ActionButton
          priority="secondary"
          onClick={onPreview}
          disabled={pendingPreview || readiness.state !== "READY"}
        >
          {pendingPreview ? "Previewing" : "Preview Summary Invocation"}
        </ActionButton>
        <ActionButton
          priority="primary"
          onClick={onCreate}
          disabled={pendingCreate || readiness.state !== "READY" || !previewReady}
        >
          {pendingCreate ? "Recording" : "Record Summary Invocation"}
        </ActionButton>
      </div>
      {createEvidence ? (
        <div
          className="pm-quality-operation-evidence"
          aria-label="PM operating quality persisted summary-invocation evidence"
        >
          <MetricRow label="Summary Invocation" value={createEvidence.summaryInvocationId} />
          <MetricRow label="Create Correlation" value={createEvidence.correlationId} />
          <MetricRow label="Create Source" value={createEvidence.sourceService} />
          <MetricRow label="Create Upstream Status" value={createEvidence.upstreamStatus} />
        </div>
      ) : null}
    </div>
  );
}
