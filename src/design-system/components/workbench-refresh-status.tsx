"use client";

import ActionButton from "./action-button";
import { cx } from "../utils/cx";
import styles from "./workbench-refresh-status.module.css";

export type WorkbenchRefreshStatusKind = "pending" | "confirmed" | "failed";

export default function WorkbenchRefreshStatus({
  kind,
  eyebrow,
  title,
  message,
  requestedContext,
  confirmedContext,
  onRetry,
  retrying = false,
  className,
}: {
  kind: WorkbenchRefreshStatusKind;
  eyebrow: string;
  title: string;
  message: string;
  requestedContext: string;
  confirmedContext: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
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
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <p className={styles.title}>{title}</p>
        <p className={styles.message}>{message}</p>
        <dl className={styles.context}>
          <div className={styles.contextItem}>
            <dt>Requested</dt>
            <dd>{requestedContext}</dd>
          </div>
          <div className={styles.contextItem}>
            <dt>Source-confirmed</dt>
            <dd>{confirmedContext}</dd>
          </div>
        </dl>
      </div>
      {kind === "failed" && onRetry ? (
        <ActionButton
          priority="secondary"
          className={styles.action}
          onClick={onRetry}
          disabled={retrying}
          aria-label="Retry performance selection"
        >
          {retrying ? "Retrying…" : "Retry selection"}
        </ActionButton>
      ) : null}
    </section>
  );
}
