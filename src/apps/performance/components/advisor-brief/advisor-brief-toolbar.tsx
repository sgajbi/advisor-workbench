import { StatusChip } from "@/design-system";

import type { PerformanceAdvisorBriefStatus } from "../../advisor-brief-view-model";

export default function AdvisorBriefToolbar({
  status,
  noteText,
  onRefresh,
}: {
  status: PerformanceAdvisorBriefStatus;
  noteText: string;
  onRefresh: () => void;
}) {
  async function handleCopyNote() {
    if (!navigator.clipboard?.writeText) {
      return;
    }
    await navigator.clipboard.writeText(noteText);
  }

  return (
    <div className="performance-advisor-brief-toolbar" aria-label="Advisor brief toolbar">
      <div className="performance-advisor-brief-toolbar-status">
        <StatusChip
          tone={
            status === "ready"
              ? "success"
              : status === "partial" || status === "loading"
                ? "warn"
                : "default"
          }
          className="performance-advisor-brief-toolbar-chip performance-advisor-brief-toolbar-chip-primary"
        >
          {status === "loading"
            ? "Refreshing"
            : status === "ready"
              ? "Ready"
              : status === "partial"
                ? "Review"
                : status === "empty"
                  ? "No Material Brief"
                  : "Unavailable"}
        </StatusChip>
        <StatusChip className="performance-advisor-brief-toolbar-chip">Source-grounded</StatusChip>
        {status === "partial" ? (
          <StatusChip tone="warn" className="performance-advisor-brief-toolbar-chip">
            Partial Evidence
          </StatusChip>
        ) : null}
      </div>
      <div className="performance-advisor-brief-toolbar-actions">
        <button
          type="button"
          className="performance-advisor-brief-toolbar-button"
          onClick={onRefresh}
        >
          Refresh
        </button>
        <button
          type="button"
          className="performance-advisor-brief-toolbar-button performance-advisor-brief-toolbar-button-primary"
          onClick={() => void handleCopyNote()}
        >
          Copy Note
        </button>
      </div>
    </div>
  );
}
