import type { PerformanceAdvisorBriefStatus } from "../../advisor-brief-view-model";

import LotusPrimaryAction from "./lotus-primary-action";
import LotusSemanticBadge from "./lotus-semantic-badge";

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
    return "No Material Brief";
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
    <div className="lotus-status-bar performance-advisor-brief-toolbar" aria-label="Advisor brief toolbar">
      <div className="lotus-status-bar-status performance-advisor-brief-toolbar-status">
        <LotusSemanticBadge
          tone={getStatusTone(status)}
          emphasis="strong"
          className="performance-advisor-brief-toolbar-chip performance-advisor-brief-toolbar-chip-primary"
        >
          {getStatusLabel(status)}
        </LotusSemanticBadge>
        <LotusSemanticBadge className="performance-advisor-brief-toolbar-chip">
          Source-grounded
        </LotusSemanticBadge>
        {status === "partial" ? (
          <LotusSemanticBadge tone="warn" className="performance-advisor-brief-toolbar-chip">
            Partial Evidence
          </LotusSemanticBadge>
        ) : null}
      </div>
      <div className="lotus-status-bar-actions performance-advisor-brief-toolbar-actions">
        <LotusPrimaryAction onClick={onRefresh}>Refresh</LotusPrimaryAction>
        <LotusPrimaryAction variant="primary" onClick={() => void handleCopyNote()}>
          Copy Note
        </LotusPrimaryAction>
      </div>
    </div>
  );
}
