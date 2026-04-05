import type { PerformanceAdvisorBriefEvidenceRef } from "../../advisor-brief-view-model";
import type { PerformanceWorkspaceMode } from "../performance-workspace-mode-switch";

export default function EvidenceChip({
  evidenceRef,
  onSelectMode,
}: {
  evidenceRef: PerformanceAdvisorBriefEvidenceRef;
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
}) {
  return (
    <button
      type="button"
      className="performance-advisor-brief-evidence-chip"
      onClick={() => onSelectMode(evidenceRef.targetMode)}
      title={evidenceRef.sourceSurface}
    >
      <span className="performance-advisor-brief-evidence-chip-label">
        {evidenceRef.metricLabel}
      </span>
      <strong className="performance-advisor-brief-evidence-chip-value">
        {evidenceRef.metricValue}
      </strong>
    </button>
  );
}
