"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { Alert } from "@mui/material";
import { useMutation } from "@tanstack/react-query";

import { ActionButton, Text, WorkbenchChoiceGroup } from "@/design-system";
import { getWorkbenchApiErrorStatus } from "@/features/workbench/api-client";

import {
  recordAdvisorIdeaConversionIntent,
  recordAdvisorIdeaFeedback,
  recordAdvisorIdeaReviewAction,
} from "../api";
import {
  buildIdeaActionReasonCodes,
  buildIdeaBusinessReasonOptions,
  type IdeaBusinessReasonOption,
} from "../idea-action-reasons";
import {
  IDEA_FEEDBACK_TAXONOMY_VERSION,
  NOT_USEFUL_REASON_OPTIONS,
  resolveAdvisorIdeaFeedbackReason,
  usefulFeedbackReasonOption,
} from "../idea-feedback";
import type { AdvisorIdeaEvidenceIdentity } from "../idea-ai-explanation-contract";
import type {
  AdvisorIdeaConversionIntentRequest,
  AdvisorIdeaFeedbackOutcome,
  AdvisorIdeaFeedbackReason,
  AdvisorIdeaFeedbackRequest,
  AdvisorIdeaReasonCode,
  AdvisorIdeaReviewAction,
  AdvisorIdeaReviewActionRequest,
} from "../types";
import styles from "./advisory-opportunities-workspace.module.css";
import IdeaCandidateExplanation from "./idea-candidate-explanation";

type IdeaActionKind = "review" | "feedback" | "conversion";

type IdeaActionSubmission =
  | {
      kind: "review";
      request: AdvisorIdeaReviewActionRequest;
      idempotencyKey: string;
    }
  | {
      kind: "feedback";
      request: AdvisorIdeaFeedbackRequest;
      idempotencyKey: string;
    }
  | {
      kind: "conversion";
      request: AdvisorIdeaConversionIntentRequest;
      idempotencyKey: string;
    };

const REVIEW_ACTIONS: Array<{ value: AdvisorIdeaReviewAction; label: string }> =
  [
    { value: "approve_for_conversion", label: "Approve for conversion review" },
    { value: "reject", label: "Reject candidate" },
    { value: "no_action", label: "Record no action" },
    { value: "suppress", label: "Suppress candidate" },
    { value: "snooze", label: "Snooze candidate" },
    { value: "escalate_to_pm", label: "Escalate to portfolio management" },
    { value: "escalate_to_compliance", label: "Escalate to compliance" },
  ];

const FEEDBACK_OUTCOME_OPTIONS = [
  { key: "useful", label: "Useful" },
  { key: "not_useful", label: "Not useful" },
] satisfies Array<{ key: AdvisorIdeaFeedbackOutcome; label: string }>;

export default function IdeaCandidateActionPanel({
  candidateId,
  candidateReasonCodes,
  evidenceIdentity,
  portfolioId,
  onRecorded,
}: {
  candidateId: string;
  candidateReasonCodes: readonly string[];
  evidenceIdentity?: AdvisorIdeaEvidenceIdentity;
  portfolioId: string;
  onRecorded: () => Promise<boolean>;
}) {
  const retryableSubmissions = useRef<
    Partial<Record<IdeaActionKind, IdeaActionSubmission>>
  >({});
  const feedbackReasonRef = useRef<HTMLSelectElement>(null);
  const [reviewAction, setReviewAction] = useState<AdvisorIdeaReviewAction>(
    "approve_for_conversion",
  );
  const businessReasonOptions = useMemo(
    () => buildIdeaBusinessReasonOptions(candidateReasonCodes),
    [candidateReasonCodes],
  );
  const defaultBusinessReason = businessReasonOptions[0].value;
  const [reviewReason, setReviewReason] = useState<AdvisorIdeaReasonCode>(
    defaultBusinessReason,
  );
  const [suppressionReason, setSuppressionReason] =
    useState<NonNullable<AdvisorIdeaReviewActionRequest["suppressionReason"]>>(
      "manual_suppression",
    );
  const [snoozedUntil, setSnoozedUntil] = useState("");
  const [feedbackOutcome, setFeedbackOutcome] =
    useState<AdvisorIdeaFeedbackOutcome>("useful");
  const [feedbackReason, setFeedbackReason] = useState<
    AdvisorIdeaFeedbackReason | ""
  >("relevant");
  const [conversionTarget, setConversionTarget] = useState("advise_proposal");
  const [conversionReason, setConversionReason] =
    useState<AdvisorIdeaReasonCode>(defaultBusinessReason);
  const [validationMessage, setValidationMessage] = useState<string>();
  const [feedbackValidationMessage, setFeedbackValidationMessage] =
    useState<string>();
  const [latestRecordedKind, setLatestRecordedKind] =
    useState<IdeaActionKind>();
  const [sourceRefreshFailed, setSourceRefreshFailed] = useState(false);

  const actionMutation = useMutation({
    mutationFn: async (submission: IdeaActionSubmission) => {
      if (submission.kind === "review") {
        return await recordAdvisorIdeaReviewAction({
          candidateId,
          portfolioId,
          idempotencyKey: submission.idempotencyKey,
          request: submission.request,
        });
      }
      if (submission.kind === "feedback") {
        return await recordAdvisorIdeaFeedback({
          candidateId,
          portfolioId,
          idempotencyKey: submission.idempotencyKey,
          request: submission.request,
        });
      }
      return await recordAdvisorIdeaConversionIntent({
        candidateId,
        portfolioId,
        idempotencyKey: submission.idempotencyKey,
        request: submission.request,
      });
    },
    onSuccess: async (_result, submission) => {
      delete retryableSubmissions.current[submission.kind];
      const sourceRefreshSucceeded = await onRecorded();
      setLatestRecordedKind(submission.kind);
      setSourceRefreshFailed(!sourceRefreshSucceeded);
    },
  });

  function recordSubmission(submission: IdeaActionSubmission) {
    setLatestRecordedKind(undefined);
    setSourceRefreshFailed(false);
    const retryableSubmission = retryableSubmissions.current[submission.kind];
    if (retryableSubmission) {
      actionMutation.mutate(retryableSubmission);
      return;
    }

    retryableSubmissions.current[submission.kind] = submission;
    actionMutation.mutate(submission);
  }

  function newIdempotencyKey(kind: IdeaActionKind): string {
    const entropy =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : String(Date.now());
    return `ui-idea-${kind}-${candidateId}-${entropy}`;
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reviewAction === "snooze" && !snoozedUntil) {
      setValidationMessage(
        "Provide a snooze-until time before recording a snooze.",
      );
      return;
    }
    setValidationMessage(undefined);
    recordSubmission({
      kind: "review",
      idempotencyKey: newIdempotencyKey("review"),
      request: {
        reviewId: `ui-idea-review-${candidateId}-${Date.now()}`,
        action: reviewAction,
        reasonCodes: buildIdeaActionReasonCodes({
          basis: reviewReason,
          kind: "review",
          reviewAction,
        }),
        decidedAtUtc: new Date().toISOString(),
        ...(reviewAction === "suppress" ? { suppressionReason } : {}),
        ...(reviewAction === "snooze"
          ? { snoozedUntilUtc: new Date(snoozedUntil).toISOString() }
          : {}),
      },
    });
  }

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = resolveAdvisorIdeaFeedbackReason(
      feedbackOutcome,
      feedbackReason,
    );
    if (!reason) {
      setFeedbackValidationMessage(
        "Select the reason this opportunity was not useful.",
      );
      feedbackReasonRef.current?.focus();
      return;
    }
    setFeedbackValidationMessage(undefined);
    setValidationMessage(undefined);
    recordSubmission({
      kind: "feedback",
      idempotencyKey: newIdempotencyKey("feedback"),
      request: {
        feedbackId: `ui-idea-feedback-${candidateId}-${Date.now()}`,
        taxonomyVersion: IDEA_FEEDBACK_TAXONOMY_VERSION,
        outcome: feedbackOutcome,
        reason,
        recordedAtUtc: new Date().toISOString(),
      },
    });
  }

  function changeFeedbackOutcome(outcome: AdvisorIdeaFeedbackOutcome) {
    clearFeedbackRetry();
    setFeedbackOutcome(outcome);
    setFeedbackReason(outcome === "useful" ? "relevant" : "");
  }

  function changeFeedbackReason(reason: AdvisorIdeaFeedbackReason) {
    clearFeedbackRetry();
    setFeedbackReason(reason);
  }

  function clearFeedbackRetry() {
    delete retryableSubmissions.current.feedback;
    setFeedbackValidationMessage(undefined);
    if (actionMutation.variables?.kind === "feedback") {
      actionMutation.reset();
    }
  }

  function submitConversion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationMessage(undefined);
    recordSubmission({
      kind: "conversion",
      idempotencyKey: newIdempotencyKey("conversion"),
      request: {
        conversionIntentId: `ui-idea-conversion-${candidateId}-${Date.now()}`,
        target:
          conversionTarget as AdvisorIdeaConversionIntentRequest["target"],
        reasonCodes: buildIdeaActionReasonCodes({
          basis: conversionReason,
          kind: "conversion",
        }),
        requestedAtUtc: new Date().toISOString(),
      },
    });
  }

  return (
    <section
      className={styles.actionPanel}
      aria-label="Idea candidate advisor actions"
    >
      <div>
        <Text variant="microLabel">Advisor Actions</Text>
        <Text variant="secondary">
          Record a review decision, usefulness feedback, or a request to
          continue in another workflow. These records do not create or approve a
          proposal, contact a client, or place an order.
        </Text>
      </div>
      <IdeaCandidateExplanation
        candidateId={candidateId}
        evidenceIdentity={evidenceIdentity}
        portfolioId={portfolioId}
      />
      <div className={styles.actionForms}>
        <form className={styles.actionForm} onSubmit={submitReview}>
          <h4>Record review</h4>
          <label>
            Review action
            <select
              value={reviewAction}
              onChange={(event) =>
                setReviewAction(event.target.value as AdvisorIdeaReviewAction)
              }
            >
              {REVIEW_ACTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <IdeaBusinessReasonSelect
            id="idea-review-business-reason"
            label="Review basis"
            options={businessReasonOptions}
            value={reviewReason}
            disabled={actionMutation.isPending}
            onChange={setReviewReason}
          />
          {reviewAction === "suppress" ? (
            <label>
              Suppression reason
              <select
                value={suppressionReason}
                onChange={(event) =>
                  setSuppressionReason(
                    event.target.value as NonNullable<
                      AdvisorIdeaReviewActionRequest["suppressionReason"]
                    >,
                  )
                }
              >
                <option value="manual_suppression">Manual suppression</option>
                <option value="duplicate">Duplicate</option>
                <option value="recently_rejected">Recently rejected</option>
                <option value="below_materiality">Below materiality</option>
                <option value="unsupported_evidence">
                  Unsupported evidence
                </option>
              </select>
            </label>
          ) : null}
          {reviewAction === "snooze" ? (
            <label>
              Snooze until
              <input
                type="datetime-local"
                value={snoozedUntil}
                onChange={(event) => setSnoozedUntil(event.target.value)}
              />
            </label>
          ) : null}
          <ActionButton
            priority="secondary"
            type="submit"
            disabled={actionMutation.isPending}
          >
            {actionMutation.isPending &&
            actionMutation.variables?.kind === "review"
              ? "Recording..."
              : "Record review"}
          </ActionButton>
        </form>

        <form
          className={styles.actionForm}
          noValidate
          onSubmit={submitFeedback}
        >
          <h4>Record feedback</h4>
          <fieldset
            className={styles.feedbackOutcomeGroup}
            aria-describedby="idea-feedback-outcome-hint"
          >
            <legend>Was this opportunity useful?</legend>
            <span id="idea-feedback-outcome-hint" className={styles.fieldHint}>
              Record how well it supported your client review.
            </span>
            <WorkbenchChoiceGroup
              value={feedbackOutcome}
              onChange={changeFeedbackOutcome}
              options={FEEDBACK_OUTCOME_OPTIONS.map((option) => ({
                ...option,
                disabled: actionMutation.isPending,
              }))}
              ariaLabel="Feedback usefulness"
              density="compact"
            />
          </fieldset>
          {feedbackOutcome === "useful" ? (
            <div
              className={styles.feedbackReasonSummary}
              data-testid="idea-feedback-reason-summary"
            >
              <span>Reason</span>
              <strong>{usefulFeedbackReasonOption().label}</strong>
            </div>
          ) : (
            <div className={styles.actionField}>
              <label htmlFor="idea-feedback-reason">
                Why was it not useful?
              </label>
              <select
                ref={feedbackReasonRef}
                id="idea-feedback-reason"
                value={feedbackReason}
                disabled={actionMutation.isPending}
                required
                aria-invalid={feedbackValidationMessage ? true : undefined}
                aria-describedby={
                  feedbackValidationMessage
                    ? "idea-feedback-reason-error idea-feedback-reason-hint"
                    : "idea-feedback-reason-hint"
                }
                onChange={(event) =>
                  changeFeedbackReason(
                    event.target.value as AdvisorIdeaFeedbackReason,
                  )
                }
              >
                <option value="">Select a reason</option>
                {NOT_USEFUL_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span id="idea-feedback-reason-hint" className={styles.fieldHint}>
                Choose the reason that best reflects this client review.
              </span>
              {feedbackValidationMessage ? (
                <span
                  id="idea-feedback-reason-error"
                  className={styles.fieldError}
                  role="alert"
                >
                  {feedbackValidationMessage}
                </span>
              ) : null}
            </div>
          )}
          <ActionButton
            priority="secondary"
            type="submit"
            disabled={actionMutation.isPending}
          >
            {actionMutation.isPending &&
            actionMutation.variables?.kind === "feedback"
              ? "Recording..."
              : "Record feedback"}
          </ActionButton>
        </form>

        <form className={styles.actionForm} onSubmit={submitConversion}>
          <h4>Record conversion intent</h4>
          <label>
            Target workflow
            <select
              value={conversionTarget}
              onChange={(event) => setConversionTarget(event.target.value)}
            >
              <option value="advise_proposal">Advise proposal review</option>
              <option value="manage_review">Manage review</option>
              <option value="report_evidence">Report evidence review</option>
            </select>
          </label>
          <IdeaBusinessReasonSelect
            id="idea-conversion-business-reason"
            label="Conversion basis"
            options={businessReasonOptions}
            value={conversionReason}
            disabled={actionMutation.isPending}
            onChange={setConversionReason}
          />
          <ActionButton
            priority="primary"
            type="submit"
            disabled={actionMutation.isPending}
          >
            {actionMutation.isPending &&
            actionMutation.variables?.kind === "conversion"
              ? "Recording..."
              : "Record intent"}
          </ActionButton>
        </form>
      </div>
      <Text variant="secondary">
        Feedback helps improve the relevance and timing of future opportunities.
        It does not approve, suppress, convert, or change policy for this
        opportunity.
      </Text>
      {validationMessage ? (
        <Alert severity="warning">{validationMessage}</Alert>
      ) : null}
      {actionMutation.error ? (
        <Alert
          severity="warning"
          data-testid="idea-action-error"
          data-action-state="not-recorded"
        >
          {ideaActionFailureCopy(
            actionMutation.error,
            actionMutation.variables?.kind,
          )}
        </Alert>
      ) : null}
      {latestRecordedKind && sourceRefreshFailed ? (
        <Alert
          severity="warning"
          aria-live="polite"
          data-testid={`idea-action-${latestRecordedKind}-status`}
          data-action-state="recorded-refresh-failed"
        >
          {formatActionKind(latestRecordedKind)} was saved, but the latest
          opportunity detail and worklist could not be loaded. Review the
          refreshed record before taking another action.
        </Alert>
      ) : null}
      {latestRecordedKind && !sourceRefreshFailed ? (
        <Alert
          severity="success"
          aria-live="polite"
          data-testid={`idea-action-${latestRecordedKind}-status`}
          data-action-state="recorded-and-refreshed"
        >
          {formatActionKind(latestRecordedKind)} saved. Opportunity detail and
          worklist are current.
        </Alert>
      ) : null}
    </section>
  );
}

function ideaActionFailureCopy(
  error: unknown,
  actionKind: IdeaActionKind | undefined,
): string {
  if (actionKind !== "feedback") {
    return "We could not confirm that the adviser action was saved. The displayed opportunity remains unchanged.";
  }

  const status = getWorkbenchApiErrorStatus(error);
  if (status === 401 || status === 403) {
    return "Feedback is not available for your current access. No feedback was saved.";
  }
  if (status === 409) {
    return "The opportunity changed or conflicts with existing feedback. Refresh it before recording new feedback; no feedback was shown as saved.";
  }
  if (status === 502 || status === 503 || status === 504) {
    return "The feedback service is unavailable. Your exact selection is retained for retry, and no feedback was shown as saved.";
  }
  return "Workbench could not verify the saved feedback against source evidence. Your exact selection is retained for retry, and the opportunity remains unchanged.";
}

function IdeaBusinessReasonSelect({
  disabled,
  id,
  label,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: AdvisorIdeaReasonCode) => void;
  options: IdeaBusinessReasonOption[];
  value: AdvisorIdeaReasonCode;
}) {
  const descriptionId = `${id}-description`;
  return (
    <div className={styles.actionField}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-describedby={descriptionId}
        onChange={(event) =>
          onChange(event.target.value as AdvisorIdeaReasonCode)
        }
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span id={descriptionId} className={styles.fieldHint}>
        Candidate reason, or Adviser review required when no reason is
        available.
      </span>
    </div>
  );
}

function formatActionKind(kind: IdeaActionKind): string {
  if (kind === "conversion") {
    return "Conversion intent";
  }
  return `${kind.slice(0, 1).toUpperCase()}${kind.slice(1)}`;
}
