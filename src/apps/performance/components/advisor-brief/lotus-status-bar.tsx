"use client";

import { useRef, useState } from "react";

import { ActionButton, SemanticBadge } from "@/design-system";
import { cx } from "@/design-system/utils/cx";
import type { PerformanceAdvisorBriefStatus } from "../../advisor-brief-view-model";
import styles from "./performance-advisor-brief.module.css";

function getStatusLabel(status: PerformanceAdvisorBriefStatus) {
  if (status === "loading") {
    return "Refreshing";
  }
  if (status === "ready") {
    return "Ready";
  }
  if (status === "partial") {
    return "Review";
  }
  if (status === "empty") {
    return "No material brief";
  }
  if (status === "permission_blocked") {
    return "Access restricted";
  }
  return "Unavailable";
}

function getStatusTone(status: PerformanceAdvisorBriefStatus) {
  if (status === "ready") {
    return "success" as const;
  }
  if (status === "partial" || status === "loading") {
    return "warn" as const;
  }
  return "default" as const;
}

export default function LotusStatusBar({
  status,
  noteText,
  onRefresh,
  canCopy,
  refreshing,
  interactionBusy,
}: {
  status: PerformanceAdvisorBriefStatus;
  noteText: string;
  onRefresh: () => void;
  canCopy: boolean;
  refreshing: boolean;
  interactionBusy: boolean;
}) {
  const [copyFeedback, setCopyFeedback] = useState<{
    source: string;
    state: "idle" | "copying" | "copied" | "failed";
  }>({ source: "", state: "idle" });
  const copyButtonRef = useRef<HTMLButtonElement | null>(null);
  const copyAvailable =
    canCopy &&
    (status === "ready" || status === "partial") &&
    noteText.trim().length > 0;
  const copySource = `${copyAvailable}:${noteText}`;
  const copyState = copyFeedback.source === copySource ? copyFeedback.state : "idle";

  async function handleCopyNote() {
    if (!copyAvailable || interactionBusy || copyState === "copying") {
      return;
    }

    setCopyFeedback({ source: copySource, state: "copying" });
    if (!navigator.clipboard?.writeText) {
      setCopyFeedback({ source: copySource, state: "failed" });
      return;
    }
    try {
      await navigator.clipboard.writeText(noteText);
      setCopyFeedback({ source: copySource, state: "copied" });
    } catch {
      setCopyFeedback({ source: copySource, state: "failed" });
    } finally {
      copyButtonRef.current?.focus();
    }
  }

  return (
    <div
      className={cx("lotus-status-bar", styles.toolbar)}
      aria-label="Adviser brief toolbar"
    >
      <div
        className={cx(
          "lotus-status-bar-status",
          styles.toolbarStatus
        )}
      >
        <SemanticBadge
          tone={getStatusTone(status)}
          emphasis="strong"
        >
          {getStatusLabel(status)}
        </SemanticBadge>
        <SemanticBadge
          tone={status === "ready" ? "success" : status === "partial" ? "warn" : "default"}
        >
          {getEvidenceLabel(status)}
        </SemanticBadge>
        {status === "partial" ? (
          <SemanticBadge tone="warn">
            Partial Evidence
          </SemanticBadge>
        ) : null}
      </div>
      <div
        className={cx(
          "lotus-status-bar-actions",
          styles.toolbarActions
        )}
      >
        <ActionButton disabled={interactionBusy} onClick={onRefresh}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </ActionButton>
        <ActionButton
          ref={copyButtonRef}
          priority="primary"
          disabled={!copyAvailable || interactionBusy || copyState === "copying"}
          onClick={() => void handleCopyNote()}
        >
          {copyState === "copying" ? "Copying…" : "Copy internal note"}
        </ActionButton>
      </div>
      {copyState === "copied" ? (
        <div
          className={styles.copyFeedback}
          role="status"
          aria-live="polite"
        >
          Internal note copied. Review it before any client communication.
        </div>
      ) : copyState === "failed" ? (
        <div className={styles.copyFeedback} role="alert">
          The internal note could not be copied. Select the brief text or try again.
        </div>
      ) : null}
    </div>
  );
}

function getEvidenceLabel(status: PerformanceAdvisorBriefStatus): string {
  switch (status) {
    case "ready":
      return "Evidence available";
    case "partial":
      return "Evidence partial";
    case "loading":
      return "Evidence checking";
    case "empty":
      return "No material evidence";
    case "permission_blocked":
      return "Evidence restricted";
    case "unavailable":
      return "Evidence unavailable";
  }
}
