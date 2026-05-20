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
  buildOutcomeClientCommunicationBoundaryView,
  buildOutcomeReviewPanelModel,
  type OutcomeReviewClientCommunicationBoundaryView,
} from "@/features/workbench/outcome-review-view-model";
import {
  buildOutcomeReviewHandoffMessages,
  buildOutcomeReviewStatePanelCopy,
  countReadyOutcomeReviewEvidence,
  describeOutcomeNarrativeRun,
  outcomeReviewAvailabilityClass,
  outcomeReviewAvailabilityLabel,
  outcomeReviewBadgeTone,
  outcomeReviewSourceEvidenceStatus,
  shouldShowOutcomeReviewStatePanel,
} from "@/features/workbench/outcome-review-panel-helpers";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";
import OutcomeReviewActionsCard from "./outcome-review-actions-card";
import OutcomeReviewClientBoundaryCard from "./outcome-review-client-boundary-card";
import OutcomeReviewTimelineCard from "./outcome-review-timeline-card";

type Props = {
  portfolioId: string;
  response: DpmOutcomeReviewGatewayResponse | null;
  errorMessage?: string | null;
};

export default function OutcomeReviewPanel({ portfolioId, response, errorMessage }: Props) {
  const [reportJobStatus, setReportJobStatus] = useState<string | null>(null);
  const [reportJobError, setReportJobError] = useState<string | null>(null);
  const [reportJobPending, setReportJobPending] = useState(false);
  const [aiNarrativeStatus, setAiNarrativeStatus] = useState<string | null>(null);
  const [aiNarrativeError, setAiNarrativeError] = useState<string | null>(null);
  const [aiNarrativePending, setAiNarrativePending] = useState(false);
  const [handoffBoundary, setHandoffBoundary] =
    useState<OutcomeReviewClientCommunicationBoundaryView | null>(null);
  const model = buildOutcomeReviewPanelModel(response);
  const primaryReview = model.items[0] ?? null;
  const clientCommunicationBoundary =
    handoffBoundary ?? primaryReview?.clientCommunicationBoundary ?? null;
  const hasItems = model.items.length > 0;
  const shouldShowStatePanel = shouldShowOutcomeReviewStatePanel(
    model.state,
    errorMessage ?? null,
  );
  const stateCopy = buildOutcomeReviewStatePanelCopy(model.state, portfolioId);
  const reportJobAvailable = Boolean(primaryReview && !primaryReview.reportInputBlocked);
  const aiNarrativeAvailable = Boolean(primaryReview && !primaryReview.aiEvidenceBlocked);
  const handoffStatusMessages = buildOutcomeReviewHandoffMessages(
    reportJobError ?? reportJobStatus,
    aiNarrativeError ?? aiNarrativeStatus,
  );
  const readyEvidenceCount = countReadyOutcomeReviewEvidence(primaryReview);
  const evidencePackStatus = outcomeReviewAvailabilityLabel(
    primaryReview?.proofPackId ?? "N/A",
  );
  const sourceEvidenceStatus =
    outcomeReviewSourceEvidenceStatus(readyEvidenceCount);
  const evidencePackHref = `/workbench/${encodeURIComponent(portfolioId)}?mode=proof`;

  async function requestOutcomeReportJob() {
    if (!primaryReview || primaryReview.reportInputBlocked || reportJobPending) {
      return;
    }
    setReportJobPending(true);
    setReportJobError(null);
    try {
      const reportInput = await getDpmOutcomeReviewReportInput(primaryReview.outcomeReviewId);
      setHandoffBoundary(buildOutcomeClientCommunicationBoundaryView(reportInput.data));
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
      setHandoffBoundary(
        buildOutcomeClientCommunicationBoundaryView(narrative.ai_evidence_input)
      );
      setAiNarrativeStatus(describeOutcomeNarrativeRun(narrative.data));
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
          <SemanticBadge tone={outcomeReviewBadgeTone(model.supportabilityState)}>
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
          <div className="outcome-review-readiness-band" aria-label="Selected outcome review readiness">
            <div>
              <span>Review Window</span>
              <strong>{primaryReview.reviewWindow}</strong>
            </div>
            <div>
              <span>Report Input</span>
              <strong>{primaryReview.reportInputBlocked ? "Blocked" : "Ready"}</strong>
            </div>
            <div>
              <span>AI Narrative</span>
              <strong>{primaryReview.aiEvidenceBlocked ? "Blocked" : "Ready"}</strong>
            </div>
            <div>
              <span>Source Evidence</span>
              <strong>{sourceEvidenceStatus}</strong>
            </div>
          </div>

          <div className="outcome-review-workspace-grid">
            <OutcomeReviewTimelineCard items={model.items} />

            <OutcomeReviewActionsCard
              primaryReview={primaryReview}
              evidencePackHref={evidencePackHref}
              aiNarrativeAvailable={aiNarrativeAvailable}
              aiNarrativePending={aiNarrativePending}
              onRequestAiNarrative={requestOutcomeAiNarrative}
            />
          </div>

          <div className="outcome-review-detail-panel" id="outcome-review-detail">
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
            <div className="outcome-review-detail-context" aria-label="Selected review source posture">
              <span>Updated {primaryReview.updatedAt}</span>
              <span>Retention {primaryReview.retentionUntil}</span>
              <span>{primaryReview.lineage.length} source refs</span>
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
                      <SemanticBadge key={`${row.key}-state`} tone={outcomeReviewBadgeTone(row.state)}>
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
                <h4>Internal Outcome Rationale</h4>
                <div className="outcome-review-rationale">
                  <p>{primaryReview.clientRationale}</p>
                </div>
                {clientCommunicationBoundary ? (
                  <OutcomeReviewClientBoundaryCard boundary={clientCommunicationBoundary} />
                ) : null}
                <h4>Evidence Availability</h4>
                <div className="outcome-review-evidence-grid">
                  <span className={outcomeReviewAvailabilityClass(primaryReview.expectedSnapshotHash)}>
                    Expected outcome {outcomeReviewAvailabilityLabel(primaryReview.expectedSnapshotHash)}
                  </span>
                  <span className={outcomeReviewAvailabilityClass(primaryReview.realizedSnapshotHash)}>
                    Realized outcome {outcomeReviewAvailabilityLabel(primaryReview.realizedSnapshotHash)}
                  </span>
                  <span className={outcomeReviewAvailabilityClass(primaryReview.proofPackId)}>
                    Evidence pack {outcomeReviewAvailabilityLabel(primaryReview.proofPackId)}
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
