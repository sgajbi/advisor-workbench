import type { ReactNode } from "react";

import { cx } from "../utils/cx";

import styles from "./support-details.module.css";

type SupportDetailsProps = {
  children: ReactNode;
  className?: string;
  context?: string;
  summary?: string;
};

export default function SupportDetails({
  children,
  className,
  context,
  summary = "Support details",
}: SupportDetailsProps) {
  return (
    <details className={cx(styles.details, className)}>
      <summary className={styles.summary}>
        <span>{summary}</span>
        {context ? <small>{context}</small> : null}
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
