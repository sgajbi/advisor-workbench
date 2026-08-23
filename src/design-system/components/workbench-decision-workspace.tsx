import type { ReactNode, Ref } from "react";

import { cx } from "../utils/cx";
import styles from "./workbench-decision-workspace.module.css";

export default function WorkbenchDecisionWorkspace({
  ariaLabel,
  worklist,
  decision,
  className,
  worklistClassName,
  decisionClassName,
  decisionId,
  decisionRef,
}: {
  ariaLabel: string;
  worklist: ReactNode;
  decision: ReactNode;
  className?: string;
  worklistClassName?: string;
  decisionClassName?: string;
  decisionId?: string;
  decisionRef?: Ref<HTMLElement>;
}) {
  return (
    <div
      className={cx(styles.workspace, className)}
      data-testid="workbench-decision-workspace"
    >
      <div className={cx(styles.worklist, worklistClassName)}>{worklist}</div>
      <section
        ref={decisionRef}
        id={decisionId}
        className={cx(styles.decision, decisionClassName)}
        aria-label={ariaLabel}
        tabIndex={decisionRef ? -1 : undefined}
      >
        {decision}
      </section>
    </div>
  );
}
