import { Alert } from "@mui/material";

import { ActionButton } from "@/design-system";

import type { IdeaActionRetryDetail } from "../idea-action-intent";

import styles from "./idea-action-retry-notice.module.css";

export function IdeaActionTerms({
  details,
  labelledBy,
}: {
  details: readonly IdeaActionRetryDetail[];
  labelledBy: string;
}) {
  return (
    <dl className={styles.intent} aria-labelledby={labelledBy}>
      {details.map((detail) => (
        <div key={detail.label}>
          <dt>{detail.label}</dt>
          <dd>{detail.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function IdeaActionRetryNotice({
  actionLabel,
  details,
  disabled,
  onRetry,
  pending,
  testId,
  title,
}: {
  actionLabel: string;
  details: readonly IdeaActionRetryDetail[];
  disabled: boolean;
  onRetry: () => void;
  pending: boolean;
  testId: string;
  title: string;
}) {
  const titleId = `${testId}-title`;

  return (
    <Alert
      severity="warning"
      role="status"
      aria-atomic="true"
      data-testid={testId}
      data-action-state="outcome-not-confirmed"
    >
      <div className={styles.notice}>
        <div>
          <strong id={titleId}>{title}</strong>
          <p>
            Retry this exact attempt to reconcile its source outcome. To record
            different terms, edit the form; Workbench will present them as a new
            action.
          </p>
        </div>
        <IdeaActionTerms details={details} labelledBy={titleId} />
        <ActionButton
          priority="secondary"
          type="button"
          disabled={disabled}
          onClick={onRetry}
        >
          {pending ? "Reconciling..." : `Retry exact ${actionLabel}`}
        </ActionButton>
      </div>
    </Alert>
  );
}
