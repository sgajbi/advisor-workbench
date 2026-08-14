"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ActionButton, SemanticBadge, type SemanticBadgeTone } from "@/design-system";
import type { AdvisorBriefReviewFeedback } from "../../use-performance-advisor-brief";
import type {
  WorkbenchAdvisorBriefWorkflowPackRun,
  WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest,
  WorkbenchAdvisorBriefWorkflowPackRunReviewActionType,
} from "@/features/workbench/types";
import {
  buildAdvisorBriefHumanReview,
  getAdvisorBriefReviewStateLabel,
} from "../../advisor-brief/advisor-brief-review-evidence";

import PerformanceWorkspaceSection from "../performance-workspace-section";

type ReviewActionDefinition = {
  label: string;
  consequence: string;
  confirmLabel: string;
};

const REVIEW_ACTIONS: Record<
  WorkbenchAdvisorBriefWorkflowPackRunReviewActionType,
  ReviewActionDefinition
> = {
  ACCEPT: {
    label: "Accept for internal use",
    consequence:
      "Records that the source-supported brief has completed human review for its permitted internal workflow. It does not approve client communication.",
    confirmLabel: "Confirm acceptance",
  },
  REJECT: {
    label: "Reject brief",
    consequence:
      "Records that this brief must not proceed because the evidence or narrative is not suitable for the intended internal use.",
    confirmLabel: "Confirm rejection",
  },
  REVISE: {
    label: "Request revision",
    consequence:
      "Records that a replacement brief is required and links the current brief to the supplied replacement reference.",
    confirmLabel: "Confirm revision request",
  },
  SUPERSEDE: {
    label: "Mark as superseded",
    consequence:
      "Records that a newer referenced brief replaces this one. The current brief remains historical evidence.",
    confirmLabel: "Confirm replacement",
  },
  ABANDON: {
    label: "Withdraw brief",
    consequence:
      "Records that this brief has been withdrawn from further internal workflow use.",
    confirmLabel: "Confirm withdrawal",
  },
};

export default function AdvisorBriefReviewWorkflow({
  workflowPackRun,
  feedback,
  isApplying,
  onApply,
}: {
  workflowPackRun: WorkbenchAdvisorBriefWorkflowPackRun;
  feedback: AdvisorBriefReviewFeedback;
  isApplying: boolean;
  onApply: (
    payload: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest
  ) => Promise<unknown>;
}) {
  const [selectedAction, setSelectedAction] =
    useState<WorkbenchAdvisorBriefWorkflowPackRunReviewActionType | "">("");
  const [reviewedBy, setReviewedBy] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [replacementRunId, setReplacementRunId] = useState("");
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const reviewButtonRef = useRef<HTMLButtonElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const allowedActions = workflowPackRun.allowed_review_actions.filter(isKnownReviewAction);
  const selectedDefinition = selectedAction ? REVIEW_ACTIONS[selectedAction] : null;
  const requiresReplacement =
    selectedAction === "REVISE" || selectedAction === "SUPERSEDE";
  const canReview =
    selectedAction !== "" &&
    reviewedBy.trim().length > 0 &&
    reviewReason.trim().length > 0 &&
    (!requiresReplacement || replacementRunId.trim().length > 0) &&
    !isApplying;

  useEffect(() => {
    if (step === "confirm") {
      confirmButtonRef.current?.focus();
    }
  }, [step]);

  useEffect(() => {
    if (feedback.state === "success") {
      feedbackRef.current?.focus({ preventScroll: true });
    }
  }, [feedback.state]);

  const reviewStateLabel = useMemo(
    () => getAdvisorBriefReviewStateLabel(workflowPackRun.review_state),
    [workflowPackRun.review_state]
  );

  async function confirmReviewAction() {
    if (!selectedAction || !canReview) {
      return;
    }

    try {
      await onApply({
        action_type: selectedAction,
        reviewed_by: reviewedBy.trim(),
        reason: reviewReason.trim(),
        replacement_run_id: requiresReplacement ? replacementRunId.trim() : undefined,
      });
      setReviewReason("");
      setReplacementRunId("");
    } catch {
      // The source failure remains visible through the persistent feedback region.
    }
  }

  return (
    <PerformanceWorkspaceSection
      ariaLabel="Advisor brief human review"
      className="performance-advisor-brief-section performance-advisor-brief-review-workflow"
      headingClassName="performance-advisor-brief-section-heading"
      kicker="Human review"
      title="Record the internal review decision"
      description="Review the evidence and narrative before recording one of the decisions currently allowed by the source workflow."
    >
      <div className="performance-advisor-brief-review-state-row">
        <span>Current review state</span>
        <SemanticBadge
          tone={getReviewStateTone(workflowPackRun)}
          emphasis="strong"
        >
          {reviewStateLabel}
        </SemanticBadge>
      </div>

      {feedback.state !== "idle" ? (
        <div
          ref={feedbackRef}
          className={`performance-advisor-brief-review-feedback performance-advisor-brief-review-feedback-${feedback.state}`}
          role={feedback.state === "failed" ? "alert" : "status"}
          aria-live={feedback.state === "failed" ? "assertive" : "polite"}
          tabIndex={feedback.state === "success" ? -1 : undefined}
        >
          {feedback.message}
        </div>
      ) : null}

      {allowedActions.length === 0 ? (
        <p className="performance-advisor-brief-review-complete">
          No further review decision is currently available for this brief. Use the source evidence
          and support details to understand its recorded state.
        </p>
      ) : step === "edit" ? (
        <div className="performance-advisor-brief-review-form">
          <label className="performance-advisor-brief-review-field">
            <span className="performance-advisor-brief-supportability-label">Review decision</span>
            <select
              className="select"
              value={selectedAction}
              onChange={(event) =>
                setSelectedAction(
                  event.target.value as WorkbenchAdvisorBriefWorkflowPackRunReviewActionType | ""
                )
              }
              disabled={isApplying}
            >
              <option value="">Choose an allowed decision</option>
              {allowedActions.map((actionType) => (
                <option key={actionType} value={actionType}>
                  {REVIEW_ACTIONS[actionType].label}
                </option>
              ))}
            </select>
          </label>

          {selectedDefinition ? (
            <p className="performance-advisor-brief-review-consequence">
              {selectedDefinition.consequence}
            </p>
          ) : null}

          <div className="performance-advisor-brief-review-field-grid">
            <label className="performance-advisor-brief-review-field">
              <span className="performance-advisor-brief-supportability-label">
                Reviewer reference
              </span>
              <input
                className="input"
                value={reviewedBy}
                onChange={(event) => setReviewedBy(event.target.value)}
                placeholder="Bank staff reference"
                autoComplete="off"
                disabled={isApplying}
              />
              <span className="performance-advisor-brief-review-helper">
                Use the bank staff reference required for this internal review record.
              </span>
            </label>

            {requiresReplacement ? (
              <label className="performance-advisor-brief-review-field">
                <span className="performance-advisor-brief-supportability-label">
                  Replacement brief reference
                </span>
                <input
                  className="input"
                  value={replacementRunId}
                  onChange={(event) => setReplacementRunId(event.target.value)}
                  placeholder="Reference published by the replacement brief"
                  autoComplete="off"
                  disabled={isApplying}
                />
              </label>
            ) : null}
          </div>

          <label className="performance-advisor-brief-review-field">
            <span className="performance-advisor-brief-supportability-label">Review rationale</span>
            <textarea
              className="textarea"
              value={reviewReason}
              onChange={(event) => setReviewReason(event.target.value)}
              placeholder="Record the evidence and business reason for this decision."
              rows={3}
              disabled={isApplying}
            />
          </label>

          <div className="performance-advisor-brief-review-action-row">
            <ActionButton
              ref={reviewButtonRef}
              priority="primary"
              disabled={!canReview}
              onClick={() => setStep("confirm")}
            >
              Review decision
            </ActionButton>
          </div>
        </div>
      ) : selectedAction && selectedDefinition ? (
        <div className="performance-advisor-brief-review-confirmation">
          <div className="performance-advisor-brief-review-confirmation-copy">
            <strong>{selectedDefinition.label}</strong>
            <p>{selectedDefinition.consequence}</p>
          </div>
          <dl className="performance-advisor-brief-review-summary">
            <div>
              <dt>Reviewer reference</dt>
              <dd>{reviewedBy.trim()}</dd>
            </div>
            <div>
              <dt>Rationale</dt>
              <dd>{reviewReason.trim()}</dd>
            </div>
            {requiresReplacement ? (
              <div>
                <dt>Replacement brief</dt>
                <dd>{replacementRunId.trim()}</dd>
              </div>
            ) : null}
          </dl>
          <p className="performance-advisor-brief-review-boundary">
            This records an internal workflow decision. It does not approve client communication,
            suitability, an order, or execution.
          </p>
          <div className="performance-advisor-brief-review-action-row">
            <ActionButton
              priority="secondary"
              disabled={isApplying}
              onClick={() => {
                setStep("edit");
                queueMicrotask(() => reviewButtonRef.current?.focus());
              }}
            >
              Back to edit
            </ActionButton>
            <ActionButton
              ref={confirmButtonRef}
              priority="primary"
              disabled={isApplying}
              onClick={() => void confirmReviewAction()}
            >
              {isApplying ? "Recording decision…" : selectedDefinition.confirmLabel}
            </ActionButton>
          </div>
        </div>
      ) : null}
    </PerformanceWorkspaceSection>
  );
}

function isKnownReviewAction(
  value: string
): value is WorkbenchAdvisorBriefWorkflowPackRunReviewActionType {
  return Object.hasOwn(REVIEW_ACTIONS, value);
}

function getReviewStateTone(
  workflowPackRun: WorkbenchAdvisorBriefWorkflowPackRun
): SemanticBadgeTone {
  const normalizedReviewState = workflowPackRun.review_state.toUpperCase();
  if (normalizedReviewState === "REJECTED" || normalizedReviewState === "ABANDONED") {
    return "danger";
  }
  const humanReview = buildAdvisorBriefHumanReview(workflowPackRun);
  if (humanReview.state === "review-required") {
    return "warn";
  }
  return humanReview.state === "reviewed" && normalizedReviewState === "ACCEPTED"
    ? "success"
    : "default";
}
