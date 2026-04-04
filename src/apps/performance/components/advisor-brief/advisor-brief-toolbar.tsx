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
        <StatusChip tone={status === "ready" ? "success" : "warn"}>
          {status === "loading" ? "Refreshing" : status === "ready" ? "Ready" : "Review"}
        </StatusChip>
        <StatusChip>Source-grounded</StatusChip>
        {status === "partial" ? <StatusChip tone="warn">Partial Evidence</StatusChip> : null}
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
          className="performance-advisor-brief-toolbar-button"
          onClick={() => void handleCopyNote()}
        >
          Copy Note
        </button>
      </div>
    </div>
  );
}
