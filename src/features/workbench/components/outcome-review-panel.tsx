"use client";

import { useState } from "react";
import {
  ActionButton,
  AnalyticsTable,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import {
  requestDpmOutcomeReviewAiNarrative,
  getDpmOutcomeReviewReportInput,
  submitDpmOutcomeReviewReportJob,
} from "@/features/workbench/api";
import type { DpmOutcomeReviewGatewayResponse } from "@/features/workbench/types";
import {
  buildOutcomeReviewPanelModel,
  type OutcomeReviewPanelState,
} from "@/features/workbench/outcome-review-view-model";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  portfolioId: string;
  response: DpmOutcomeReviewGatewayResponse | null;
  errorMessage?: string | null;
};

function badgeTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toUpperCase();
  if (normalized === "SUPPORTED" || normalized === "READY" || normalized === "WITHIN_TOLERANCE") {
    return "success";
  }
  if (normalized === "DEGRADED" || normalized === "PARTIAL" || normalized.includes("REVIEW")) {
    return "warn";
  }
  if (normalized === "BLOCKED" || normalized === "UNSUPPORTED" || normalized.includes("BREACH")) {
    return "danger";
  }
  return "default";
}

function statePanelCopy(state: OutcomeReviewPanelState, portfolioId: string) {
  if (state === "empty") {
    return {
      kind: "empty" as const,
      title: "No outcome reviews for this portfolio",
      body: `No outcome review is currently available for ${portfolioId}.`,
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked" as const,
      title: "Outcome review handoff is blocked",
      body: "Resolve the open review items before preparing advisor handoffs.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable" as const,
      title: "Outcome review is not supported",
      body: "Outcome review is not available for this portfolio.",
    };
  }
  return {
    kind: "partial" as const,
    title: "Outcome review data is unavailable",
    body: "Outcome review details are temporarily unavailable for this portfolio.",
  };
}

export default function OutcomeReviewPanel({ portfolioId, response, errorMessage }: Props) {
  const [reportJobStatus, setReportJobStatus] = useState<string | null>(null);
  const [reportJobError, setReportJobError] = useState<string | null>(null);
  const [reportJobPending, setReportJobPending] = useState(false);
  const [aiNarrativeStatus, setAiNarrativeStatus] = useState<string | null>(null);
  const [aiNarrativeError, setAiNarrativeError] = useState<string | null>(null);
  const [aiNarrativePending, setAiNarrativePending] = useState(false);
  const model = buildOutcomeReviewPanelModel(response);
  const primaryReview = model.items[0] ?? null;
  const hasItems = model.items.length > 0;
  const shouldShowStatePanel =
    Boolean(errorMessage) || model.state === "empty" || model.state === "blocked" || model.state === "unsupported" || model.state === "unavailable";
  const stateCopy = statePanelCopy(model.state, portfolioId);
  const reportJobAvailable = Boolean(primaryReview && !primaryReview.reportInputBlocked);
  const aiNarrativeAvailable = Boolean(primaryReview && !primaryReview.aiEvidenceBlocked);
  const handoffStatusMessages = [
    reportJobError ?? reportJobStatus,
    aiNarrativeError ?? aiNarrativeStatus,
  ].filter((message): message is string => Boolean(message));
  const readyEvidenceCount = primaryReview
    ? [
        primaryReview.expectedSnapshotHash,
        primaryReview.realizedSnapshotHash,
        primaryReview.proofPackId,
        primaryReview.lineage.length > 0 ? "available" : "",
      ].filter((value) => value && value !== "N/A").length
    : 0;
  const evidencePackStatus = primaryReview?.proofPackId !== "N/A" ? "Available" : "Not available";

  async function requestOutcomeReportJob() {
    if (!primaryReview || primaryReview.reportInputBlocked || reportJobPending) {
      return;
    }
    setReportJobPending(true);
    setReportJobError(null);
    try {
      const reportInput = await getDpmOutcomeReviewReportInput(primaryReview.outcomeReviewId);
      const handle = await submitDpmOutcomeReviewReportJob({
        outcomeReviewId: primaryReview.outcomeReviewId,
        outcomeReportInput: reportInput.data,
      });
      setReportJobStatus(`Report request ${businessStateLabel(handle.status)}.`);
    } catch (error) {
      setReportJobError(error instanceof Error ? error.message : "Outcome report job failed");
    } finally {
      setReportJobPending(false);
    }
  }

  async function requestOutcomeAiNarrative() {
    if (!primaryReview || primaryReview.aiEvidenceBlocked || aiNarrativePending) {
      return;
    }
    setAiNarrativePending(true);
    setAiNarrativeError(null);
    try {
      const narrative = await requestDpmOutcomeReviewAiNarrative({
        outcomeReviewId: primaryReview.outcomeReviewId,
      });
      setAiNarrativeStatus(describeNarrativeRun(narrative.data));
    } catch (error) {
      setAiNarrativeError(
        error instanceof Error ? error.message : "Outcome review request failed"
      );
    } finally {
      setAiNarrativePending(false);
    }
  }

  return (
    <SectionBlock
      title="Outcome Reviews"
      subtitle="Review mandate outcomes, advisor observations, and evidence readiness."
      className="outcome-review-panel"
      actions={
        <div className="outcome-review-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
            {businessStateLabel(model.supportabilityState)}
          </SemanticBadge>
          <SemanticBadge>Evidence available</SemanticBadge>
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={errorMessage ? "Outcome review is unavailable" : stateCopy.title}
          body={errorMessage ?? stateCopy.body}
        />
      ) : null}

      <div className="outcome-review-status-strip">
        <MetricRow label="Latest Review" value={primaryReview?.reviewPostureLabel ?? "N/A"} />
        <MetricRow label="Outcome Status" value={primaryReview?.outcomeStatusLabel ?? "N/A"} />
        <MetricRow label="Drift Improvement" value={primaryReview?.driftImprovementLabel ?? "N/A"} />
        <MetricRow label="Evidence Pack" value={evidencePackStatus} />
      </div>

      {model.supportabilityReasons.length > 0 || model.blockedActions.length > 0 || model.remediationOwner !== "N/A" ? (
        <div className="outcome-review-reason-row">
          {[
            ...model.supportabilityReasons,
            ...model.blockedActions,
            ...(model.remediationOwner !== "N/A" ? [`Owner: ${model.remediationOwner}`] : []),
          ].map((reason) => (
            <SemanticBadge key={reason} tone={reason.startsWith("CREATE") || reason.startsWith("REQUEST") ? "danger" : "warn"}>
              {reason.startsWith("Owner: ") ? reason : formatBusinessReason(reason)}
            </SemanticBadge>
          ))}
        </div>
      ) : null}

      {primaryReview && hasItems ? (
        <>
          <div className="outcome-review-workspace-grid">
            <div className="outcome-review-card outcome-review-timeline-card">
              <div className="outcome-review-card-header">
                <h3>Review Timeline</h3>
                <span>{model.items.length} returned</span>
              </div>
              <AnalyticsTable
                ariaLabel="Outcome reviews"
                variant="portfolio"
                density="compact"
                columns={[
                  { key: "review", label: "Review" },
                  { key: "window", label: "Window" },
                  { key: "outcome", label: "Outcome" },
                  { key: "state", label: "Status" },
                  { key: "evidence", label: "Evidence" },
                ]}
                rows={model.items.map((item) => ({
                  key: item.outcomeReviewId,
                  cells: [
                    item.reviewLabel,
                    item.reviewWindow,
                    item.outcomeStatusLabel,
                    <SemanticBadge key={`${item.outcomeReviewId}-state`} tone={badgeTone(item.state)}>
                      {businessStateLabel(item.state)}
                    </SemanticBadge>,
                    item.proofPackId !== "N/A" ? "Available" : "Not available",
                  ],
                }))}
                emptyState={{
                  title: "No outcome reviews returned",
                  body: "No outcome review rows are currently available for this portfolio.",
                }}
              />
            </div>

            <div className="outcome-review-card outcome-review-actions-card">
              <div className="outcome-review-card-header">
                <h3>Recommended Actions</h3>
              </div>
              <div className="outcome-review-action-stack">
                <button type="button">
                  <strong>Review client impact</strong>
                  <span>Assess outcome dimensions against the mandate objective.</span>
                </button>
                <button type="button">
                  <strong>Open evidence pack</strong>
                  <span>{evidencePackStatus === "Available" ? "Review the available mandate evidence." : "Evidence pack has not been returned."}</span>
                </button>
                <button type="button">
                  <strong>Record advisor note</strong>
                  <span>Capture the business rationale before closing the review.</span>
                </button>
              </div>
            </div>
          </div>

          <div className="outcome-review-detail-panel">
            <div className="outcome-review-detail-header">
              <div>
                <h3>Selected Review Detail</h3>
                <span>{primaryReview.reviewLabel}</span>
              </div>
              <div className="outcome-review-detail-actions">
                <ActionButton
                  priority="secondary"
                  onClick={requestOutcomeReportJob}
                  disabled={!reportJobAvailable || reportJobPending}
                >
                  {reportJobPending ? "Requesting report" : "Request report"}
                </ActionButton>
                <ActionButton
                  priority="secondary"
                  onClick={requestOutcomeAiNarrative}
                  disabled={!aiNarrativeAvailable || aiNarrativePending}
                >
                  {aiNarrativePending ? "Requesting memo" : "Request advisor memo"}
                </ActionButton>
              </div>
            </div>

            <div className="outcome-review-detail-grid">
              <section>
                <h4>Mandate Impact</h4>
                <p>{primaryReview.mandateImpact}</p>
                <AnalyticsTable
                  ariaLabel="Outcome review dimensions"
                  variant="analysis"
                  density="compact"
                  columns={[
                    { key: "dimension", label: "Dimension" },
                    { key: "expected", label: "Expected", align: "right" },
                    { key: "realized", label: "Realized", align: "right" },
                    { key: "variance", label: "Variance", align: "right" },
                    { key: "state", label: "State" },
                  ]}
                  rows={primaryReview.dimensions.map((row) => ({
                    key: row.key,
                    cells: [
                      businessStateLabel(row.dimension),
                      row.expected,
                      row.realized,
                      row.variance,
                      <SemanticBadge key={`${row.key}-state`} tone={badgeTone(row.state)}>
                        {businessStateLabel(row.state)}
                      </SemanticBadge>,
                    ],
                  }))}
                  emptyState={{
                    title: "No dimension results returned",
                    body: "The review exists, but no expected-versus-realized dimension rows are available.",
                  }}
                />
              </section>

              <section>
                <h4>Client-Facing Rationale</h4>
                <div className="outcome-review-rationale">
                  <p>{primaryReview.clientRationale}</p>
                </div>
                <h4>Evidence Availability</h4>
                <div className="outcome-review-evidence-grid">
                  <span className={availabilityClass(primaryReview.expectedSnapshotHash)}>
                    Expected outcome {availabilityLabel(primaryReview.expectedSnapshotHash)}
                  </span>
                  <span className={availabilityClass(primaryReview.realizedSnapshotHash)}>
                    Realized outcome {availabilityLabel(primaryReview.realizedSnapshotHash)}
                  </span>
                  <span className={availabilityClass(primaryReview.proofPackId)}>
                    Evidence pack {availabilityLabel(primaryReview.proofPackId)}
                  </span>
                  <span className={readyEvidenceCount >= 3 ? "is-available" : "is-muted"}>
                    Source evidence {readyEvidenceCount >= 3 ? "Available" : "Partial"}
                  </span>
                </div>
              </section>
            </div>
          </div>
        </>
      ) : null}

      {handoffStatusMessages.length > 0 ? (
        <div className="outcome-review-handoff-messages">
          {handoffStatusMessages.map((message) => (
            <Text key={message} variant="secondary" className="muted">
              {message}
            </Text>
          ))}
        </div>
      ) : null}
    </SectionBlock>
  );
}

function describeNarrativeRun(data: Record<string, unknown>): string {
  const workflowPackRun = readRecord(data.workflow_pack_run);
  const execution = readRecord(data.execution);
  const status = readString(execution.status) ?? "submitted";
  const reviewState = readString(workflowPackRun.review_state);
  return `Review request ${businessStateLabel(reviewState ?? status)}.`;
}

function availabilityLabel(value: string): string {
  return value && value !== "N/A" ? "Available" : "Not available";
}

function availabilityClass(value: string): string {
  return value && value !== "N/A" ? "is-available" : "is-muted";
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
