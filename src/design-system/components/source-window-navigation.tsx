"use client";

import { useEffect, useRef } from "react";

import ActionButton from "./action-button";
import styles from "./source-window-navigation.module.css";

export default function SourceWindowNavigation({
  ariaLabel,
  currentWindow,
  hasPrevious,
  hasNext,
  canNext = hasNext,
  isLoading = false,
  itemLabel,
  viewLabel,
  onPrevious,
  onNext,
}: {
  ariaLabel: string;
  currentWindow: number;
  hasPrevious: boolean;
  hasNext: boolean;
  canNext?: boolean;
  isLoading?: boolean;
  itemLabel: string;
  viewLabel: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const pendingFocusDirection = useRef<"previous" | "next" | null>(null);

  useEffect(() => {
    const direction = pendingFocusDirection.current;
    if (!direction || isLoading) {
      return;
    }

    const activatedControl = direction === "next" ? nextRef.current : previousRef.current;
    const activeElement = document.activeElement;
    if (activeElement !== document.body && activeElement !== activatedControl) {
      pendingFocusDirection.current = null;
      return;
    }

    const preferredControl = direction === "next" ? nextRef.current : previousRef.current;
    const fallbackControl = direction === "next" ? previousRef.current : nextRef.current;
    const focusTarget =
      preferredControl && !preferredControl.disabled ? preferredControl : fallbackControl;
    if (focusTarget && !focusTarget.disabled) {
      focusTarget.focus();
    }
    pendingFocusDirection.current = null;
  }, [currentWindow, hasNext, hasPrevious, isLoading]);

  if (!hasPrevious && !hasNext) {
    return null;
  }

  return (
    <nav className={styles.navigation} aria-label={ariaLabel}>
      <ActionButton
        ref={previousRef}
        priority="quiet"
        disabled={!hasPrevious}
        aria-disabled={!hasPrevious || isLoading}
        onClick={() => {
          pendingFocusDirection.current = "previous";
          onPrevious();
        }}
      >
        Previous {itemLabel}
      </ActionButton>
      <span className={styles.label} aria-live="polite">
        {isLoading ? `Loading ${itemLabel}` : `${viewLabel} ${currentWindow}`}
      </span>
      <ActionButton
        ref={nextRef}
        priority="quiet"
        disabled={!canNext}
        aria-disabled={!canNext || isLoading}
        onClick={() => {
          pendingFocusDirection.current = "next";
          onNext();
        }}
      >
        Next {itemLabel}
      </ActionButton>
    </nav>
  );
}
