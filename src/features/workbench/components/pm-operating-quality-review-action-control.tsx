"use client";

import { ActionButton, MetricRow, Text } from "@/design-system";
import styles from "@/features/workbench/components/pm-operating-quality.module.css";
import PmOperatingQualityStateBadge from "@/features/workbench/components/pm-operating-quality-state-badge";
import type {
  PmQualityReviewTargetOption,
  PmQualityReviewActionEvidence,
  PmQualityReviewActionForm,
} from "@/features/workbench/pm-operating-quality-actions";

type Props = {
  form: PmQualityReviewActionForm;
  readiness: { state: string; detail: string };
  previewReady: boolean;
  pendingPreview: boolean;
  pendingCreate: boolean;
  createEvidence: PmQualityReviewActionEvidence | null;
  targetOptions: PmQualityReviewTargetOption[];
  onFormChange: (field: keyof PmQualityReviewActionForm, value: string) => void;
  onPreview: () => void;
  onCreate: () => void;
};

export default function PmOperatingQualityReviewActionControl({
  form,
  readiness,
  previewReady,
  pendingPreview,
  pendingCreate,
  createEvidence,
  targetOptions,
  onFormChange,
  onPreview,
  onCreate,
}: Props) {
  const visibleTargetOptions = targetOptions.filter(
    (option) => option.targetType === form.targetType
  );

  return (
    <div
      className={styles.controlForm}
      aria-label="PM operating quality supervisory review-action control"
    >
      <div className={styles.cardHeader}>
        <Text as="h3" variant="subsectionTitle">
          Supervisory Action Control
        </Text>
        <PmOperatingQualityStateBadge state={readiness.state} />
      </div>
      <div className={styles.controlFormGrid}>
        <label className={`${styles.fieldLabel} workbench-field-label`} htmlFor="pm-quality-review-actor">
          Supervisor actor
          <input
            id="pm-quality-review-actor"
            className="workbench-input"
            value={form.actorId}
            onChange={(event) => onFormChange("actorId", event.target.value)}
          />
        </label>
        <label className={`${styles.fieldLabel} workbench-field-label`} htmlFor="pm-quality-review-target-type">
          Target type
          <select
            id="pm-quality-review-target-type"
            className="workbench-input"
            value={form.targetType}
            onChange={(event) => onFormChange("targetType", event.target.value)}
          >
            <option value="SCORE_RUN">Score run</option>
            <option value="FAIRNESS_ANALYSIS">Fairness analysis</option>
          </select>
        </label>
        <label className={`${styles.fieldLabel} workbench-field-label`} htmlFor="pm-quality-review-action-type">
          Action type
          <select
            id="pm-quality-review-action-type"
            className="workbench-input"
            value={form.actionType}
            onChange={(event) => onFormChange("actionType", event.target.value)}
          >
            <option value="REQUEST_EVIDENCE_REMEDIATION">Request evidence remediation</option>
            <option value="SUPERVISORY_REVIEW">Supervisory review</option>
            <option value="REQUEST_POLICY_REVIEW">Request policy review</option>
          </select>
        </label>
        <label className={`${styles.fieldLabel} workbench-field-label`} htmlFor="pm-quality-review-action-state">
          Action state
          <select
            id="pm-quality-review-action-state"
            className="workbench-input"
            value={form.actionState}
            onChange={(event) => onFormChange("actionState", event.target.value)}
          >
            <option value="REVIEW_REQUIRED">Review required</option>
            <option value="PENDING_REVIEW">Pending review</option>
            <option value="EVIDENCE_REQUESTED">Evidence requested</option>
          </select>
        </label>
        <label className={`${styles.fieldLabel} workbench-field-label`} htmlFor="pm-quality-review-ref">
          Bank review ref
          <input
            id="pm-quality-review-ref"
            className="workbench-input"
            value={form.reviewActionRef}
            onChange={(event) => onFormChange("reviewActionRef", event.target.value)}
          />
        </label>
      </div>
      <label className={`${styles.fieldLabel} workbench-field-label`} htmlFor="pm-quality-review-rationale">
        Bounded supervisory rationale
        <textarea
          id="pm-quality-review-rationale"
          className={`${styles.rationale} workbench-input`}
          value={form.boundedRationale}
          onChange={(event) => onFormChange("boundedRationale", event.target.value)}
          rows={3}
        />
      </label>
      <div
        className={styles.commandReadiness}
        aria-label="PM operating quality review-action readiness"
      >
        <MetricRow label="Preview Readiness" value={readiness.detail} />
        <MetricRow
          label="Selected Record"
          value={form.targetId || "No Gateway-returned target selected"}
        />
        <MetricRow
          label="Source Target"
          value={
            visibleTargetOptions.find((option) => option.value === form.targetId)?.detail ??
            "No Gateway-returned target selected"
          }
        />
        <MetricRow
          label="Create Control"
          value={
            previewReady
              ? "Preview available; create records an immutable Manage review action"
              : "Preview required before create"
          }
        />
        <MetricRow
          label="Boundary"
          value="Supervisory record only; no PM ranking, HR, conduct, client communication, trade, order, OMS, execution, fills, or settlement action is enabled"
        />
      </div>
      <div className={styles.actionRow}>
        <ActionButton
          priority="secondary"
          onClick={onPreview}
          disabled={pendingPreview || readiness.state !== "READY"}
        >
          {pendingPreview ? "Previewing" : "Preview Review Action"}
        </ActionButton>
        <ActionButton
          priority="primary"
          onClick={onCreate}
          disabled={pendingCreate || readiness.state !== "READY" || !previewReady}
        >
          {pendingCreate ? "Recording" : "Record Review Action"}
        </ActionButton>
      </div>
      {createEvidence ? (
        <div
          className={styles.operationEvidence}
          aria-label="PM operating quality persisted review-action evidence"
        >
          <MetricRow label="Review Action" value={createEvidence.reviewActionId} />
          <MetricRow label="Create Correlation" value={createEvidence.correlationId} />
          <MetricRow label="Create Source" value={createEvidence.sourceService} />
          <MetricRow label="Create Upstream Status" value={createEvidence.upstreamStatus} />
        </div>
      ) : null}
    </div>
  );
}
