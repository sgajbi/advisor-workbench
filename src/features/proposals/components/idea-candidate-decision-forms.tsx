import type { FormEventHandler } from "react";

import { ActionButton } from "@/design-system";

import {
  conversionRetryDetails,
  REVIEW_ACTIONS,
  reviewRetryDetails,
  type IdeaActionKind,
  type RetryableIdeaActionSubmission,
} from "../idea-action-intent";
import type { IdeaBusinessReasonOption } from "../idea-action-reasons";
import type {
  AdvisorIdeaReasonCode,
  AdvisorIdeaReviewAction,
  AdvisorIdeaReviewActionRequest,
} from "../types";
import styles from "./advisory-opportunities-workspace.module.css";
import IdeaActionRetryNotice from "./idea-action-retry-notice";

type SharedFormProps = {
  businessReasonOptions: IdeaBusinessReasonOption[];
  isPending: boolean;
  pendingKind?: IdeaActionKind;
};

export function IdeaReviewActionForm({
  businessReasonOptions,
  intentChanged,
  isPending,
  onActionChange,
  onReasonChange,
  onRetry,
  onSnoozedUntilChange,
  onSubmit,
  onSuppressionReasonChange,
  pendingKind,
  retryableSubmission,
  reviewAction,
  reviewReason,
  snoozedUntil,
  suppressionReason,
}: SharedFormProps & {
  intentChanged: boolean;
  onActionChange: (value: AdvisorIdeaReviewAction) => void;
  onReasonChange: (value: AdvisorIdeaReasonCode) => void;
  onRetry: (submission: RetryableIdeaActionSubmission) => void;
  onSnoozedUntilChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onSuppressionReasonChange: (
    value: NonNullable<AdvisorIdeaReviewActionRequest["suppressionReason"]>,
  ) => void;
  retryableSubmission?: RetryableIdeaActionSubmission;
  reviewAction: AdvisorIdeaReviewAction;
  reviewReason: AdvisorIdeaReasonCode;
  snoozedUntil: string;
  suppressionReason: NonNullable<
    AdvisorIdeaReviewActionRequest["suppressionReason"]
  >;
}) {
  const retryableReview =
    retryableSubmission?.kind === "review" ? retryableSubmission : undefined;
  return (
    <form className={styles.actionForm} onSubmit={onSubmit}>
      <h4>Record review</h4>
      <label>
        Review action
        <select
          value={reviewAction}
          disabled={isPending}
          onChange={(event) =>
            onActionChange(event.target.value as AdvisorIdeaReviewAction)
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
        disabled={isPending}
        onChange={onReasonChange}
      />
      {reviewAction === "suppress" ? (
        <label>
          Suppression reason
          <select
            value={suppressionReason}
            disabled={isPending}
            onChange={(event) =>
              onSuppressionReasonChange(
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
            <option value="unsupported_evidence">Unsupported evidence</option>
          </select>
        </label>
      ) : null}
      {reviewAction === "snooze" ? (
        <label>
          Snooze until
          <input
            type="datetime-local"
            value={snoozedUntil}
            disabled={isPending}
            onChange={(event) => onSnoozedUntilChange(event.target.value)}
          />
        </label>
      ) : null}
      {retryableReview ? (
        <IdeaActionRetryNotice
          actionLabel="review"
          details={reviewRetryDetails(
            retryableReview.request,
            businessReasonOptions,
          )}
          disabled={isPending}
          pending={isPending && pendingKind === "review"}
          onRetry={() => onRetry(retryableReview)}
          testId="idea-review-retry"
          title="Review outcome not confirmed"
        />
      ) : null}
      <ActionButton
        priority="secondary"
        type="submit"
        disabled={isPending || Boolean(retryableReview && !intentChanged)}
      >
        {isPending && pendingKind === "review"
          ? "Recording..."
          : retryableReview && intentChanged
            ? "Record updated review"
            : retryableReview
              ? "Change review to record new"
              : "Record review"}
      </ActionButton>
    </form>
  );
}

export function IdeaConversionIntentForm({
  businessReasonOptions,
  conversionReason,
  conversionTarget,
  intentChanged,
  isPending,
  onReasonChange,
  onRetry,
  onSubmit,
  onTargetChange,
  pendingKind,
  retryableSubmission,
}: SharedFormProps & {
  conversionReason: AdvisorIdeaReasonCode;
  conversionTarget: string;
  intentChanged: boolean;
  onReasonChange: (value: AdvisorIdeaReasonCode) => void;
  onRetry: (submission: RetryableIdeaActionSubmission) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onTargetChange: (value: string) => void;
  retryableSubmission?: RetryableIdeaActionSubmission;
}) {
  const retryableConversion =
    retryableSubmission?.kind === "conversion"
      ? retryableSubmission
      : undefined;
  return (
    <form className={styles.actionForm} onSubmit={onSubmit}>
      <h4>Record conversion intent</h4>
      <label>
        Target workflow
        <select
          value={conversionTarget}
          disabled={isPending}
          onChange={(event) => onTargetChange(event.target.value)}
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
        disabled={isPending}
        onChange={onReasonChange}
      />
      {retryableConversion ? (
        <IdeaActionRetryNotice
          actionLabel="conversion intent"
          details={conversionRetryDetails(
            retryableConversion.request,
            businessReasonOptions,
          )}
          disabled={isPending}
          pending={isPending && pendingKind === "conversion"}
          onRetry={() => onRetry(retryableConversion)}
          testId="idea-conversion-retry"
          title="Conversion intent outcome not confirmed"
        />
      ) : null}
      <ActionButton
        priority="primary"
        type="submit"
        disabled={isPending || Boolean(retryableConversion && !intentChanged)}
      >
        {isPending && pendingKind === "conversion"
          ? "Recording..."
          : retryableConversion && intentChanged
            ? "Record updated intent"
            : retryableConversion
              ? "Change intent to record new"
              : "Record intent"}
      </ActionButton>
    </form>
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
        Candidate reason, or Adviser review required when no reason is
        available.
      </span>
    </div>
  );
}
