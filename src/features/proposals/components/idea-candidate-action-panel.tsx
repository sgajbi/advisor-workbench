"use client";

import { useRef, useState, type FormEvent } from "react";
import { Alert } from "@mui/material";
import { useMutation } from "@tanstack/react-query";

import { ActionButton, Text } from "@/design-system";

import {
  recordAdvisorIdeaConversionIntent,
  recordAdvisorIdeaFeedback,
  recordAdvisorIdeaReviewAction,
} from "../api";
import type {
  AdvisorIdeaConversionIntentRequest,
  AdvisorIdeaFeedbackRequest,
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
  portfolioId,
  onRecorded,
}: {
  candidateId: string;
  portfolioId: string;
  onRecorded: () => Promise<void>;
}) {
  const idempotencyKeys = useRef<Partial<Record<IdeaActionKind, string>>>({});
  const [reviewAction, setReviewAction] = useState<AdvisorIdeaReviewAction>(
    "approve_for_conversion",
  );
  const [reviewReasonCodes, setReviewReasonCodes] = useState("advisor_review");
  const [suppressionReason, setSuppressionReason] =
    useState<NonNullable<AdvisorIdeaReviewActionRequest["suppressionReason"]>>(
      "manual_suppression",
    );
  const [snoozedUntil, setSnoozedUntil] = useState("");
  const [feedbackOutcome, setFeedbackOutcome] = useState("useful");
  const [feedbackReasonCodes, setFeedbackReasonCodes] =
    useState("advisor_feedback");
  const [conversionTarget, setConversionTarget] = useState("advise_proposal");
  const [conversionReasonCodes, setConversionReasonCodes] = useState(
    "advisor_conversion_intent",
  );
  const [validationMessage, setValidationMessage] = useState<string>();
  const [latestRecordedKind, setLatestRecordedKind] =
    useState<IdeaActionKind>();

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
      delete idempotencyKeys.current[submission.kind];
      setLatestRecordedKind(submission.kind);
      await onRecorded();
    },
  });

  function idempotencyKeyFor(kind: IdeaActionKind): string {
    const existing = idempotencyKeys.current[kind];
    if (existing) {
      return existing;
    }
    const entropy =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : String(Date.now());
    const key = `ui-idea-${kind}-${candidateId}-${entropy}`;
    idempotencyKeys.current[kind] = key;
    return key;
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reasonCodes = parseReasonCodes(reviewReasonCodes);
    if (!reasonCodes.length) {
      setValidationMessage("Enter at least one review reason code.");
      return;
    }
    if (reviewAction === "snooze" && !snoozedUntil) {
      setValidationMessage(
        "Provide a snooze-until time before recording a snooze.",
      );
      return;
    }
    setValidationMessage(undefined);
    actionMutation.mutate({
      kind: "review",
      idempotencyKey: idempotencyKeyFor("review"),
      request: {
        reviewId: `ui-idea-review-${candidateId}-${Date.now()}`,
        action: reviewAction,
        reasonCodes,
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
    const reasonCodes = parseReasonCodes(feedbackReasonCodes);
    if (!reasonCodes.length) {
      setValidationMessage("Enter at least one feedback reason code.");
      return;
    }
    setValidationMessage(undefined);
    actionMutation.mutate({
      kind: "feedback",
      idempotencyKey: idempotencyKeyFor("feedback"),
      request: {
        feedbackId: `ui-idea-feedback-${candidateId}-${Date.now()}`,
        outcome: feedbackOutcome as AdvisorIdeaFeedbackRequest["outcome"],
        reasonCodes,
        recordedAtUtc: new Date().toISOString(),
      },
    });
  }

  function submitConversion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reasonCodes = parseReasonCodes(conversionReasonCodes);
    if (!reasonCodes.length) {
      setValidationMessage("Enter at least one conversion-intent reason code.");
      return;
    }
    setValidationMessage(undefined);
    actionMutation.mutate({
      kind: "conversion",
      idempotencyKey: idempotencyKeyFor("conversion"),
      request: {
        conversionIntentId: `ui-idea-conversion-${candidateId}-${Date.now()}`,
        target:
          conversionTarget as AdvisorIdeaConversionIntentRequest["target"],
        reasonCodes,
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
          <label>
            Reason codes
            <input
              value={reviewReasonCodes}
              onChange={(event) => setReviewReasonCodes(event.target.value)}
            />
          </label>
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
          <label>
            Reason codes
            <input
              value={feedbackReasonCodes}
              onChange={(event) => setFeedbackReasonCodes(event.target.value)}
            />
          </label>
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
          <label>
            Reason codes
            <input
              value={conversionReasonCodes}
              onChange={(event) => setConversionReasonCodes(event.target.value)}
            />
          </label>
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
        Separate multiple reason codes with commas.
      </Text>
      {validationMessage ? (
        <Alert severity="warning">{validationMessage}</Alert>
      ) : null}
      {actionMutation.error ? (
        <Alert severity="warning">
          The advisor action could not be recorded through Gateway. No local
          review or conversion state has been created.
        </Alert>
      ) : null}
      {latestRecordedKind ? (
        <Alert severity="success" aria-live="polite">
          {formatActionKind(latestRecordedKind)} recorded through Gateway.
          Source-owned detail and queue posture have been refreshed.
        </Alert>
      ) : null}
    </section>
  );
}

function parseReasonCodes(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((reason) => reason.trim())
        .filter(Boolean),
    ),
  ];
}

function formatActionKind(kind: IdeaActionKind): string {
  if (kind === "conversion") {
    return "Conversion intent";
  }
  return `${kind.slice(0, 1).toUpperCase()}${kind.slice(1)}`;
}
