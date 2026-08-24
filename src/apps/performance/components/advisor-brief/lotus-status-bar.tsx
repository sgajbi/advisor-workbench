"use client";

import { useRef, useState } from "react";

import { ActionButton, SemanticBadge } from "@/design-system";
import type { PerformanceAdvisorBriefStatus } from "../../advisor-brief-view-model";

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
    <div className="lotus-status-bar performance-advisor-brief-toolbar" aria-label="Adviser brief toolbar">
      <div className="lotus-status-bar-status performance-advisor-brief-toolbar-status">
        <SemanticBadge
          tone={getStatusTone(status)}
          emphasis="strong"
          className="performance-advisor-brief-toolbar-chip performance-advisor-brief-toolbar-chip-primary"
        >
          {getStatusLabel(status)}
        </SemanticBadge>
        <SemanticBadge
          tone={status === "ready" ? "success" : status === "partial" ? "warn" : "default"}
          className="performance-advisor-brief-toolbar-chip"
        >
          {getEvidenceLabel(status)}
        </SemanticBadge>
        {status === "partial" ? (
          <SemanticBadge tone="warn" className="performance-advisor-brief-toolbar-chip">
            Partial Evidence
          </SemanticBadge>
        ) : null}
      </div>
      <div className="lotus-status-bar-actions performance-advisor-brief-toolbar-actions">
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
        <div className="performance-advisor-brief-copy-feedback" role="status" aria-live="polite">
          Internal note copied. Review it before any client communication.
        </div>
      ) : copyState === "failed" ? (
        <div className="performance-advisor-brief-copy-feedback" role="alert">
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
