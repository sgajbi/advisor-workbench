"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { Alert } from "@mui/material";
import { useMutation } from "@tanstack/react-query";

import { ActionButton, Text } from "@/design-system";

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
import type {
  AdvisorIdeaConversionIntentRequest,
  AdvisorIdeaFeedbackRequest,
  AdvisorIdeaReasonCode,
  AdvisorIdeaReviewAction,
  AdvisorIdeaReviewActionRequest,
} from "../types";
import styles from "./advisory-opportunities-workspace.module.css";

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

export default function IdeaCandidateActionPanel({
  candidateId,
  candidateReasonCodes,
  portfolioId,
  onRecorded,
}: {
  candidateId: string;
  candidateReasonCodes: readonly string[];
  portfolioId: string;
  onRecorded: () => Promise<boolean>;
}) {
  const retryableSubmissions = useRef<
    Partial<Record<IdeaActionKind, IdeaActionSubmission>>
  >({});
  const [reviewAction, setReviewAction] = useState<AdvisorIdeaReviewAction>(
    "approve_for_conversion",
  );
  const businessReasonOptions = useMemo(
    () => buildIdeaBusinessReasonOptions(candidateReasonCodes),
    [candidateReasonCodes],
  );
  const defaultBusinessReason = businessReasonOptions[0].value;
  const [reviewReason, setReviewReason] =
    useState<AdvisorIdeaReasonCode>(defaultBusinessReason);
  const [suppressionReason, setSuppressionReason] =
    useState<NonNullable<AdvisorIdeaReviewActionRequest["suppressionReason"]>>(
      "manual_suppression",
    );
  const [snoozedUntil, setSnoozedUntil] = useState("");
  const [feedbackOutcome, setFeedbackOutcome] = useState("useful");
  const [feedbackReason, setFeedbackReason] =
    useState<AdvisorIdeaReasonCode>(defaultBusinessReason);
  const [conversionTarget, setConversionTarget] = useState("advise_proposal");
  const [conversionReason, setConversionReason] =
    useState<AdvisorIdeaReasonCode>(defaultBusinessReason);
  const [validationMessage, setValidationMessage] = useState<string>();
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
    setValidationMessage(undefined);
    recordSubmission({
      kind: "feedback",
      idempotencyKey: newIdempotencyKey("feedback"),
      request: {
        feedbackId: `ui-idea-feedback-${candidateId}-${Date.now()}`,
        outcome: feedbackOutcome as AdvisorIdeaFeedbackRequest["outcome"],
        reasonCodes: buildIdeaActionReasonCodes({
          basis: feedbackReason,
          kind: "feedback",
        }),
        recordedAtUtc: new Date().toISOString(),
      },
    });
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
          Record a source-owned review, feedback, or conversion intent through
          Gateway. These records do not create a proposal, grant downstream
          authority, or change supported-feature posture.
        </Text>
      </div>
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

        <form className={styles.actionForm} onSubmit={submitFeedback}>
          <h4>Record feedback</h4>
          <label>
            Feedback outcome
            <select
              value={feedbackOutcome}
              onChange={(event) => setFeedbackOutcome(event.target.value)}
            >
              <option value="useful">Useful</option>
              <option value="not_useful">Not useful</option>
              <option value="duplicate">Duplicate</option>
              <option value="too_late">Too late</option>
              <option value="missing_context">Missing context</option>
              <option value="unsupported_claim">Unsupported claim</option>
            </select>
          </label>
          <IdeaBusinessReasonSelect
            id="idea-feedback-business-reason"
            label="Feedback basis"
            options={businessReasonOptions}
            value={feedbackReason}
            disabled={actionMutation.isPending}
            onChange={setFeedbackReason}
          />
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
        Business reasons use the source-supported vocabulary, with the selected
        candidate&apos;s published reasons shown first. Workbench adds the matching
        audit reason for each action.
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
          The advisor action could not be recorded through Gateway. No local
          review or conversion state has been created.
        </Alert>
      ) : null}
      {latestRecordedKind && sourceRefreshFailed ? (
        <Alert
          severity="warning"
          aria-live="polite"
          data-testid={`idea-action-${latestRecordedKind}-status`}
          data-action-state="recorded-refresh-failed"
        >
          {formatActionKind(latestRecordedKind)} was recorded through Gateway,
          but source-owned detail or queue posture could not be refreshed. The
          displayed posture may be stale; retry the page refresh before taking
          a further action.
        </Alert>
      ) : null}
      {latestRecordedKind && !sourceRefreshFailed ? (
        <Alert
          severity="success"
          aria-live="polite"
          data-testid={`idea-action-${latestRecordedKind}-status`}
          data-action-state="recorded-and-refreshed"
        >
          {formatActionKind(latestRecordedKind)} recorded through Gateway.
          Source-owned detail and queue posture have been refreshed.
        </Alert>
      ) : null}
    </section>
  );
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
        Candidate-backed reason, or the governed review fallback when none is
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
