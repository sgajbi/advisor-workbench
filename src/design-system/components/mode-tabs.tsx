"use client";

import { useRef, type KeyboardEvent } from "react";

import { cx } from "../utils/cx";
import type { WorkbenchChoiceGroupOption } from "./workbench-choice-group";
import styles from "./mode-tabs.module.css";

function safeIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function modeTabId(idBase: string, key: string) {
  return `${safeIdPart(idBase)}-tab-${safeIdPart(key)}`;
}

export function modePanelId(idBase: string, key: string) {
  return `${safeIdPart(idBase)}-panel-${safeIdPart(key)}`;
}

export default function ModeTabs<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  idBase,
  className,
  accentModeKey,
  variant = "line",
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<WorkbenchChoiceGroupOption<T>>;
  ariaLabel: string;
  idBase: string;
  className?: string;
  accentModeKey?: T;
  variant?: "line" | "contained";
}) {
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const selectedIndex = options.findIndex((option) => option.key === value);
  const fallbackIndex = options.findIndex((option) => !option.disabled);
  const tabStopIndex = selectedIndex >= 0 ? selectedIndex : fallbackIndex;

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, optionKey: T) {
    const enabled = options.filter((option) => !option.disabled);
    if (enabled.length === 0) return;
    const currentIndex = enabled.findIndex((option) => option.key === optionKey);
    let nextKey: T | null = null;
    if (event.key === "Home") nextKey = enabled[0].key;
    if (event.key === "End") nextKey = enabled.at(-1)!.key;
    if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
      const step = event.key === "ArrowLeft" ? -1 : 1;
      const startIndex = currentIndex >= 0 ? currentIndex : step > 0 ? -1 : 0;
      nextKey = enabled[(startIndex + step + enabled.length) % enabled.length].key;
    }
    if (nextKey === null) return;
    event.preventDefault();
    tabRefs.current.get(nextKey)?.focus();
    if (nextKey !== value) onChange(nextKey);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx(
        styles.list,
        variant === "contained" && styles.contained,
        accentModeKey && value === accentModeKey && styles.accent,
        className
      )}
      data-workbench-tabs
      data-variant={variant}
    >
      {options.map((option, index) => {
        const isSelected = option.key === value;
        return (
          <button
            key={option.key}
            ref={(element) => {
              if (element) tabRefs.current.set(option.key, element);
              else tabRefs.current.delete(option.key);
            }}
            type="button"
            role="tab"
            id={modeTabId(idBase, option.key)}
            aria-controls={modePanelId(idBase, option.key)}
            aria-selected={isSelected}
            aria-disabled={option.disabled || undefined}
            tabIndex={index === tabStopIndex ? 0 : -1}
            title={option.title}
            className={cx(styles.tab, isSelected && styles.selected)}
            data-workbench-tab
            data-state={isSelected ? "selected" : "unselected"}
            onClick={() => {
              if (!option.disabled && option.key !== value) onChange(option.key);
            }}
            onKeyDown={(event) => moveTab(event, option.key)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
