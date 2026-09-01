"use client";

import ActionButton from "./action-button";
import { cx } from "../utils/cx";
import styles from "./workbench-refresh-status.module.css";

export type WorkbenchRefreshStatusKind = "pending" | "confirmed" | "failed";

type WorkbenchRefreshStatusCommonProps = {
  eyebrow: string;
  title: string;
  confirmedContext: string;
  className?: string;
};

export type WorkbenchRefreshStatusProps =
  | (WorkbenchRefreshStatusCommonProps & { kind: "confirmed" })
  | (WorkbenchRefreshStatusCommonProps & {
      kind: "pending";
      message: string;
      requestedContext: string;
    })
  | (WorkbenchRefreshStatusCommonProps & {
      kind: "failed";
      message: string;
      requestedContext?: string;
      onRetry?: () => void;
      retrying?: boolean;
      retryLabel?: string;
      retryText?: string;
    });

export default function WorkbenchRefreshStatus(props: WorkbenchRefreshStatusProps) {
  const { kind, eyebrow, title, confirmedContext, className } = props;
  const accessibilityProps =
    kind === "failed"
      ? { role: "alert" as const, "aria-live": "assertive" as const }
      : { role: "status" as const, "aria-live": "polite" as const };

  return (
    <section
      {...accessibilityProps}
      aria-atomic="true"
      className={cx(styles.root, styles[kind], className)}
      data-testid="workbench-refresh-status"
      data-state={kind}
    >
      {kind === "confirmed" ? (
        <div className={cx(styles.copy, styles.confirmedCopy)}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <p className={styles.confirmedSummary}>
            <span className={styles.title}>{title}</span>
            <span className={styles.confirmedContext}>{confirmedContext}</span>
          </p>
        </div>
      ) : (
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <p className={styles.title}>{title}</p>
          <p className={styles.message}>{props.message}</p>
          <dl className={styles.context}>
            {props.requestedContext ? (
              <div className={styles.contextItem}>
                <dt>Requested</dt>
                <dd>{props.requestedContext}</dd>
              </div>
            ) : null}
            <div className={styles.contextItem}>
              <dt>Source-confirmed</dt>
              <dd>{confirmedContext}</dd>
            </div>
          </dl>
        </div>
      )}
      {kind === "failed" && props.onRetry ? (
        <ActionButton
          priority="secondary"
          className={styles.action}
          onClick={props.onRetry}
          disabled={props.retrying ?? false}
          aria-label={props.retryLabel ?? "Retry performance selection"}
        >
          {props.retrying ? "Retrying…" : (props.retryText ?? "Retry selection")}
        </ActionButton>
      ) : null}
    </section>
  );
}
