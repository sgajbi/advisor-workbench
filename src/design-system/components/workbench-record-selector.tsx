"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "../utils/cx";
import styles from "./workbench-record-selector.module.css";

export type WorkbenchRecordSelectorFact = {
  label: string;
  value: ReactNode;
};

export type WorkbenchRecordSelectorItem<T extends string> = {
  key: T;
  title: string;
  subtitle?: string;
  status?: ReactNode;
  facts?: ReadonlyArray<WorkbenchRecordSelectorFact>;
  nextAction?: string;
  disabled?: boolean;
  sourceEvidence?: {
    source: string;
    identity: string;
    state: string;
  };
};

type NavigationKey = "ArrowDown" | "ArrowUp" | "End" | "Home";

export default function WorkbenchRecordSelector<T extends string>({
  ariaLabel,
  items,
  selectedKey,
  onSelectionChange,
  className,
  layout = "list",
  detailId,
  onOpenDetail,
}: {
  ariaLabel: string;
  items: ReadonlyArray<WorkbenchRecordSelectorItem<T>>;
  selectedKey: T | null;
  onSelectionChange: (key: T) => void;
  className?: string;
  layout?: "list" | "grid";
  detailId?: string;
  onOpenDetail?: (key: T) => void;
}) {
  const optionRefs = useRef(new Map<T, HTMLButtonElement>());
  const enabledItems = items.filter((item) => !item.disabled);
  const selectedIndex = items.findIndex(
    (item) => item.key === selectedKey && !item.disabled,
  );
  const fallbackIndex = items.findIndex((item) => !item.disabled);
  const tabStopIndex = selectedIndex >= 0 ? selectedIndex : fallbackIndex;

  function moveSelection(
    event: KeyboardEvent<HTMLButtonElement>,
    currentKey: T,
  ) {
    if (!["ArrowDown", "ArrowUp", "End", "Home"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    if (enabledItems.length === 0) return;

    const navigationKey = event.key as NavigationKey;
    const currentIndex = enabledItems.findIndex(
      (item) => item.key === currentKey,
    );
    const nextItem =
      navigationKey === "Home"
        ? enabledItems[0]
        : navigationKey === "End"
          ? enabledItems.at(-1)
          : enabledItems[
              (currentIndex +
                (navigationKey === "ArrowUp" ? -1 : 1) +
                enabledItems.length) %
                enabledItems.length
            ];

    if (!nextItem) return;
    optionRefs.current.get(nextItem.key)?.focus();
    if (nextItem.key !== selectedKey) onSelectionChange(nextItem.key);
  }

  return (
    <div
      className={cx(styles.list, className)}
      role="listbox"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      data-workbench-record-selector
      data-layout={layout}
    >
      {items.map((item, index) => {
        const selected = item.key === selectedKey;
        return (
          <button
            key={item.key}
            ref={(element) => {
              if (element) optionRefs.current.set(item.key, element);
              else optionRefs.current.delete(item.key);
            }}
            type="button"
            role="option"
            aria-selected={selected}
            aria-disabled={item.disabled || undefined}
            aria-controls={!item.disabled ? detailId : undefined}
            tabIndex={index === tabStopIndex ? 0 : -1}
            className={cx(styles.item, selected && styles.selected)}
            data-state={selected ? "selected" : "unselected"}
            data-source-render-row={item.sourceEvidence?.source}
            data-source={item.sourceEvidence?.source}
            data-source-identity={item.sourceEvidence?.identity}
            data-source-state={item.sourceEvidence?.state}
            onClick={() => {
              if (!item.disabled && item.key !== selectedKey)
                onSelectionChange(item.key);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !item.disabled) {
                event.preventDefault();
                if (item.key !== selectedKey) onSelectionChange(item.key);
                onOpenDetail?.(item.key);
                return;
              }
              moveSelection(event, item.key);
            }}
          >
            <span className={styles.heading}>
              <span className={styles.identity}>
                <strong>{item.title}</strong>
                {item.subtitle ? <span>{item.subtitle}</span> : null}
              </span>
              <span className={styles.posture}>
                {item.status}
                <span className={styles.selectionLabel}>
                  {selected ? "Selected" : "Review"}
                </span>
              </span>
            </span>
            {item.facts?.length ? (
              <span className={styles.facts} data-workbench-record-facts>
                {item.facts.map((fact) => (
                  <span className={styles.fact} key={fact.label}>
                    <span>{fact.label}</span>
                    <strong>{fact.value}</strong>
                  </span>
                ))}
              </span>
            ) : null}
            {item.nextAction ? (
              <span className={styles.nextAction}>
                <span>Next action</span>
                <strong>{item.nextAction}</strong>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
