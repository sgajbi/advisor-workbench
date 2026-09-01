"use client";

import { MetricRow, Text } from "@/design-system";
import styles from "@/features/workbench/components/pm-operating-quality.module.css";
import PmOperatingQualityReviewActionControl from "@/features/workbench/components/pm-operating-quality-review-action-control";
import PmOperatingQualityStateBadge from "@/features/workbench/components/pm-operating-quality-state-badge";
import { formatPmQualityReasonCodeList } from "@/features/workbench/pm-operating-quality-panel-helpers";
import type {
  PmQualityReviewTargetOption,
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
  targetOptions?: PmQualityReviewTargetOption[];
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
  targetOptions = [],
  onFormChange,
  onPreview,
  onCreate,
}: Props) {
  const hasDetail = model.reviewActionDetail.reviewActionId !== "N/A";

  return (
    <>
      {form && readiness && onFormChange && onPreview && onCreate ? (
        <PmOperatingQualityReviewActionControl
          form={form}
          readiness={readiness}
          previewReady={previewReady}
          pendingPreview={pendingPreview}
          pendingCreate={pendingCreate}
          createEvidence={createEvidence}
          targetOptions={targetOptions}
          onFormChange={onFormChange}
          onPreview={onPreview}
          onCreate={onCreate}
        />
      ) : null}

      <div className={styles.reviewActionGrid}>
        <div className={styles.reviewActionDetail}>
          <div className={styles.cardHeader}>
            <Text as="h3" variant="subsectionTitle">
              Supervisory Review Action Detail
            </Text>
            <PmOperatingQualityStateBadge
              state={hasDetail ? model.reviewActionDetail.actionState : "PENDING"}
              label={hasDetail ? undefined : "No detail"}
            />
          </div>
          <div
            className={styles.reviewActionStatus}
            aria-label="PM operating quality supervisory review action status"
          >
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

      </div>
    </>
  );
}
