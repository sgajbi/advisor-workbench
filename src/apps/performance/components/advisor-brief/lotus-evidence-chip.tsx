import type { PerformanceAdvisorBriefEvidenceRef } from "../../advisor-brief-view-model";
import type { PerformanceWorkspaceMode } from "../../performance-workspace-modes";

export default function LotusEvidenceChip({
  evidenceRef,
  onSelectMode,
}: {
  evidenceRef: PerformanceAdvisorBriefEvidenceRef;
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
}) {
  return (
    <button
      type="button"
      className="lotus-evidence-chip performance-advisor-brief-evidence-chip"
      onClick={() => onSelectMode(evidenceRef.targetMode)}
      title={evidenceRef.sourceSurface}
    >
      <span className="lotus-evidence-chip-label performance-advisor-brief-evidence-chip-label">
        {evidenceRef.metricLabel}
      </span>
      <strong className="lotus-evidence-chip-value performance-advisor-brief-evidence-chip-value">
        {evidenceRef.metricValue}
      </strong>
    </button>
  );
}
