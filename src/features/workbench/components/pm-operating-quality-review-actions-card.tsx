"use client";

import { ActionButton, AnalyticsTable, MetricRow, Text } from "@/design-system";
import PmOperatingQualityStateBadge from "@/features/workbench/components/pm-operating-quality-state-badge";
import { formatPmQualityReasonCodeList } from "@/features/workbench/pm-operating-quality-panel-helpers";
import type {
  PmQualityReviewActionEvidence,
  PmQualityReviewActionForm,
} from "@/features/workbench/pm-operating-quality-actions";
import type { PmOperatingQualityPanelModel } from "@/features/workbench/pm-operating-quality-view-model";

type Props = {
  model: PmOperatingQualityPanelModel;
  form?: PmQualityReviewActionForm;
  readiness?: { state: string; detail: string };
  previewReady?: boolean;
  pendingPreview?: boolean;
  pendingCreate?: boolean;
  createEvidence?: PmQualityReviewActionEvidence | null;
  onFormChange?: (field: keyof PmQualityReviewActionForm, value: string) => void;
  onPreview?: () => void;
  onCreate?: () => void;
};

export default function PmOperatingQualityReviewActionsCard({
  model,
  form,
  readiness,
  previewReady = false,
  pendingPreview = false,
  pendingCreate = false,
  createEvidence = null,
  onFormChange,
  onPreview,
  onCreate,
}: Props) {
  const hasDetail = model.reviewActionDetail.reviewActionId !== "N/A";
  const canRenderForm = Boolean(form && readiness && onFormChange && onPreview && onCreate);

  return (
    <>
      {canRenderForm ? (
        <div
          className="pm-quality-review-action-form"
          aria-label="PM operating quality supervisory review-action control"
        >
          <div className="pm-quality-card-header">
            <Text as="h3" variant="subsectionTitle">
              Supervisory Action Control
            </Text>
            <PmOperatingQualityStateBadge state={readiness!.state} />
          </div>
          <div className="pm-quality-review-action-form-grid">
            <label className="workbench-field-label" htmlFor="pm-quality-review-actor">
              Supervisor actor
              <input
                id="pm-quality-review-actor"
                className="workbench-input"
                value={form!.actorId}
                onChange={(event) => onFormChange!("actorId", event.target.value)}
              />
            </label>
            <label className="workbench-field-label" htmlFor="pm-quality-review-target-type">
              Target type
              <select
                id="pm-quality-review-target-type"
                className="workbench-input"
                value={form!.targetType}
                onChange={(event) => onFormChange!("targetType", event.target.value)}
              >
                <option value="SCORE_RUN">Score run</option>
                <option value="FAIRNESS_ANALYSIS">Fairness analysis</option>
              </select>
            </label>
            <label className="workbench-field-label" htmlFor="pm-quality-review-target-id">
              Target id
              <input
                id="pm-quality-review-target-id"
                className="workbench-input"
                value={form!.targetId}
                onChange={(event) => onFormChange!("targetId", event.target.value)}
              />
            </label>
            <label className="workbench-field-label" htmlFor="pm-quality-review-action-type">
              Action type
              <select
                id="pm-quality-review-action-type"
                className="workbench-input"
                value={form!.actionType}
                onChange={(event) => onFormChange!("actionType", event.target.value)}
              >
                <option value="REQUEST_EVIDENCE_REMEDIATION">Request evidence remediation</option>
                <option value="SUPERVISORY_REVIEW">Supervisory review</option>
                <option value="REQUEST_POLICY_REVIEW">Request policy review</option>
              </select>
            </label>
            <label className="workbench-field-label" htmlFor="pm-quality-review-action-state">
              Action state
              <select
                id="pm-quality-review-action-state"
                className="workbench-input"
                value={form!.actionState}
                onChange={(event) => onFormChange!("actionState", event.target.value)}
              >
                <option value="REVIEW_REQUIRED">Review required</option>
                <option value="PENDING_REVIEW">Pending review</option>
                <option value="EVIDENCE_REQUESTED">Evidence requested</option>
              </select>
            </label>
            <label className="workbench-field-label" htmlFor="pm-quality-review-ref">
              Bank review ref
              <input
                id="pm-quality-review-ref"
                className="workbench-input"
                value={form!.reviewActionRef}
                onChange={(event) => onFormChange!("reviewActionRef", event.target.value)}
              />
            </label>
          </div>
          <label className="workbench-field-label" htmlFor="pm-quality-review-rationale">
            Bounded supervisory rationale
            <textarea
              id="pm-quality-review-rationale"
              className="workbench-input"
              value={form!.boundedRationale}
              onChange={(event) => onFormChange!("boundedRationale", event.target.value)}
              rows={3}
            />
          </label>
          <div
            className="pm-quality-command-readiness"
            aria-label="PM operating quality review-action readiness"
          >
            <MetricRow label="Preview Readiness" value={readiness!.detail} />
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
          <div className="pm-quality-action-row">
            <ActionButton
              priority="secondary"
              onClick={onPreview}
              disabled={pendingPreview || readiness!.state !== "READY"}
            >
              {pendingPreview ? "Previewing" : "Preview Review Action"}
            </ActionButton>
            <ActionButton
              priority="primary"
              onClick={onCreate}
              disabled={pendingCreate || readiness!.state !== "READY" || !previewReady}
            >
              {pendingCreate ? "Recording" : "Record Review Action"}
            </ActionButton>
          </div>
          {createEvidence ? (
            <div
              className="pm-quality-operation-evidence"
              aria-label="PM operating quality persisted review-action evidence"
            >
              <MetricRow label="Review Action" value={createEvidence.reviewActionId} />
              <MetricRow label="Create Correlation" value={createEvidence.correlationId} />
              <MetricRow label="Create Source" value={createEvidence.sourceService} />
              <MetricRow label="Create Upstream Status" value={createEvidence.upstreamStatus} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="pm-quality-review-action-grid">
      <div className="pm-quality-review-action-detail">
        <div className="pm-quality-card-header">
          <Text as="h3" variant="subsectionTitle">
            Supervisory Review Action Detail
          </Text>
          <PmOperatingQualityStateBadge
            state={hasDetail ? model.reviewActionDetail.actionState : "PENDING"}
            label={hasDetail ? undefined : "No detail"}
          />
        </div>
        <div aria-label="PM operating quality supervisory review-action posture">
          <MetricRow
            label="Gateway Read State"
            value={
              hasDetail
                ? "Review action returned by Gateway"
                : "Awaiting Manage review-action detail"
            }
          />
          <MetricRow label="Review Action" value={model.reviewActionDetail.reviewActionRef} />
          <MetricRow label="Target" value={model.reviewActionDetail.target} />
          <MetricRow label="Action" value={model.reviewActionDetail.actionType} />
          <MetricRow label="Actor" value={model.reviewActionDetail.actorId} />
          <MetricRow label="As Of" value={model.reviewActionDetail.asOfDate} />
          <MetricRow label="Policy" value={model.reviewActionDetail.policy} />
          <MetricRow
            label="Supervisory Rationale"
            value={model.reviewActionDetail.rationale}
          />
          <MetricRow
            label="Reason Codes"
            value={formatPmQualityReasonCodeList(model.reviewActionDetail.reasonCodes)}
          />
          <MetricRow label="Source Refs" value={model.reviewActionDetail.sourceRefs} />
          <MetricRow
            label="Operating Boundary"
            value={model.reviewActionDetail.operatingBoundaries}
          />
        </div>
      </div>

      <AnalyticsTable
        ariaLabel="PM operating quality supervisory review actions"
        variant="analysis"
        density="compact"
        columns={[
          { key: "action", label: "Review Action" },
          { key: "target", label: "Target" },
          { key: "type", label: "Action Type" },
          { key: "state", label: "State" },
          { key: "actor", label: "Actor" },
          { key: "asOf", label: "As Of" },
          { key: "policy", label: "Policy" },
          { key: "source", label: "Source Refs" },
          { key: "reason", label: "Reason" },
        ]}
        rows={model.reviewActionRows.map((row) => ({
          key: row.key,
          cells: [
            <strong key={`${row.key}-action`}>{row.reviewActionRef}</strong>,
            row.target,
            row.actionType,
            <PmOperatingQualityStateBadge key={`${row.key}-state`} state={row.actionState} />,
            row.actorId,
            row.asOfDate,
            row.policy,
            row.sourceRefs,
            formatPmQualityReasonCodeList(row.reasonCodes),
          ],
        }))}
        emptyState={{
          title: "No supervisory review actions returned",
          body: "Workbench waits for Manage-persisted PM quality review actions through Gateway.",
        }}
      />
    </div>
    </>
  );
}
