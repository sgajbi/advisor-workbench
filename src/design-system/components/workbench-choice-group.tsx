"use client";

import { useRef, type KeyboardEvent } from "react";

import { cx } from "../utils/cx";
import styles from "./workbench-choice-group.module.css";

export type WorkbenchChoiceGroupOption<T extends string> = {
  key: T;
  label: string;
  disabled?: boolean;
  title?: string;
};

type ChoiceGroupKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End";

function nextEnabledKey<T extends string>(
  options: Array<WorkbenchChoiceGroupOption<T>>,
  currentKey: T,
  key: ChoiceGroupKey,
): T | null {
  const enabled = options.filter((option) => !option.disabled);
  if (enabled.length === 0) return null;
  if (key === "Home") return enabled[0].key;
  if (key === "End") return enabled.at(-1)!.key;

  const currentIndex = enabled.findIndex((option) => option.key === currentKey);
  const step = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  const startIndex = currentIndex >= 0 ? currentIndex : step > 0 ? -1 : 0;
  return enabled[(startIndex + step + enabled.length) % enabled.length].key;
}

export default function WorkbenchChoiceGroup<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  density = "standard",
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<WorkbenchChoiceGroupOption<T>>;
  ariaLabel: string;
  className?: string;
  density?: "standard" | "compact";
}) {
  const optionRefs = useRef(new Map<T, HTMLButtonElement>());
  const selectedIndex = options.findIndex((option) => option.key === value);
  const fallbackIndex = options.findIndex((option) => !option.disabled);
  const tabStopIndex = selectedIndex >= 0 ? selectedIndex : fallbackIndex;

  function moveSelection(event: KeyboardEvent<HTMLButtonElement>, optionKey: T) {
    if (![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const nextKey = nextEnabledKey(options, optionKey, event.key as ChoiceGroupKey);
    if (nextKey === null) return;
    optionRefs.current.get(nextKey)?.focus();
    if (nextKey !== value) onChange(nextKey);
  }

  return (
    <div
      className={cx(styles.group, density === "compact" && styles.compact, className)}
      role="radiogroup"
      aria-label={ariaLabel}
      data-workbench-choice-group
      data-density={density}
    >
      {options.map((option, index) => {
        const isSelected = option.key === value;
        return (
          <button
            key={option.key}
            ref={(element) => {
              if (element) optionRefs.current.set(option.key, element);
              else optionRefs.current.delete(option.key);
            }}
            type="button"
            role="radio"
            suppressHydrationWarning
            aria-checked={isSelected}
            aria-disabled={option.disabled || undefined}
            tabIndex={index === tabStopIndex ? 0 : -1}
            title={option.title}
            className={cx(styles.option, isSelected && styles.selected)}
            data-workbench-choice-option
            data-state={isSelected ? "selected" : "unselected"}
            onClick={() => {
              if (!option.disabled && option.key !== value) onChange(option.key);
            }}
            onKeyDown={(event) => moveSelection(event, option.key)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
