import type { KeyboardEventHandler, ReactNode, Ref } from "react";

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
  onDecisionKeyDown,
}: {
  ariaLabel: string;
  worklist: ReactNode;
  decision: ReactNode;
  className?: string;
  worklistClassName?: string;
  decisionClassName?: string;
  decisionId?: string;
  decisionRef?: Ref<HTMLElement>;
  onDecisionKeyDown?: KeyboardEventHandler<HTMLElement>;
}) {
  return (
    <div className={styles.container}>
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
          onKeyDown={onDecisionKeyDown}
        >
          {decision}
        </section>
      </div>
    </div>
  );
}
