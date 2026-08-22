import type { ReactNode } from "react";

import { cx } from "../utils/cx";
import styles from "./workbench-decision-workspace.module.css";

export default function WorkbenchDecisionWorkspace({
  ariaLabel,
  worklist,
  decision,
  className,
  worklistClassName,
  decisionClassName,
}: {
  ariaLabel: string;
  worklist: ReactNode;
  decision: ReactNode;
  className?: string;
  worklistClassName?: string;
  decisionClassName?: string;
}) {
  return (
    <div className={cx(styles.workspace, className)} data-testid="workbench-decision-workspace">
      <div className={cx(styles.worklist, worklistClassName)}>{worklist}</div>
      <section
        className={cx(styles.decision, decisionClassName)}
        aria-label={ariaLabel}
      >
        {decision}
      </section>
    </div>
  );
}
