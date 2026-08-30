"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import Text from "./text";
import WorkbenchDecisionWorkspace from "./workbench-decision-workspace";
import WorkbenchRecordSelector, {
  type WorkbenchRecordSelectorItem,
} from "./workbench-record-selector";
import styles from "./workbench-worklist.module.css";

export default function WorkbenchWorklist<T extends string>({
  ariaLabel,
  relationshipIdBase,
  title,
  eyebrow = "Priority worklist",
  description = "Use arrow keys to move through the worklist. Press Enter to review the selected record.",
  items,
  selectedKey,
  onSelectionChange,
  decisionLabel,
  decision,
  actions,
  className,
  worklistClassName,
  decisionClassName,
}: {
  ariaLabel: string;
  relationshipIdBase: string;
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  items: ReadonlyArray<WorkbenchRecordSelectorItem<T>>;
  selectedKey: T | null;
  onSelectionChange: (key: T) => void;
  decisionLabel: string;
  decision: ReactNode;
  actions?: ReactNode;
  className?: string;
  worklistClassName?: string;
  decisionClassName?: string;
}) {
  const titleId = `${relationshipIdBase}-title`;
  const decisionId = `${relationshipIdBase}-decision`;
  const decisionRef = useRef<HTMLElement>(null);
  const worklistRef = useRef<HTMLElement>(null);

  function returnFocusToSelectedRecord(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape" || event.defaultPrevented) return;

    const selectedRecord =
      worklistRef.current?.querySelector<HTMLButtonElement>(
        '[role="option"][aria-selected="true"]:not([aria-disabled="true"])',
      );
    if (!selectedRecord) return;

    event.preventDefault();
    selectedRecord.focus();
  }

  return (
    <WorkbenchDecisionWorkspace
      ariaLabel={decisionLabel}
      className={className}
      worklistClassName={worklistClassName}
      decisionClassName={decisionClassName}
      decisionId={decisionId}
      decisionRef={decisionRef}
      onDecisionKeyDown={returnFocusToSelectedRecord}
      worklist={
        <section
          ref={worklistRef}
          className={styles.worklist}
          aria-labelledby={titleId}
        >
          <div className={styles.header}>
            <div className={styles.heading}>
              <Text variant="microLabel">{eyebrow}</Text>
              <Text variant="subsectionTitle" as="h3" id={titleId}>
                {title}
              </Text>
              {description ? (
                <Text variant="secondary">{description}</Text>
              ) : null}
            </div>
            {actions ? <div className={styles.actions}>{actions}</div> : null}
          </div>
          <WorkbenchRecordSelector
            ariaLabel={ariaLabel}
            items={items}
            selectedKey={selectedKey}
            onSelectionChange={onSelectionChange}
            detailId={decisionId}
            onOpenDetail={() => decisionRef.current?.focus()}
          />
        </section>
      }
      decision={decision}
    />
  );
}

export type { WorkbenchRecordSelectorItem as WorkbenchWorklistItem };
