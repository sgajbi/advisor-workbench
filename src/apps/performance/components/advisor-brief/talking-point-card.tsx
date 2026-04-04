import { StatusChip } from "@/design-system";

import type { PerformanceAdvisorBriefItem } from "../../advisor-brief-view-model";
import type { PerformanceWorkspaceMode } from "../performance-workspace-mode-switch";

import EvidenceChip from "./evidence-chip";

function toToneLabel(tone: PerformanceAdvisorBriefItem["tone"]) {
  if (tone === "warning") {
    return "Review";
  }
  if (tone === "positive") {
    return "Supported";
  }
  return "Source-grounded";
}

export default function TalkingPointCard({
  item,
  onSelectMode,
}: {
  item: PerformanceAdvisorBriefItem;
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
}) {
  return (
    <article className="performance-advisor-brief-item">
      <header className="performance-advisor-brief-item-header">
        <h4>{item.headline}</h4>
        <StatusChip
          tone={item.tone === "warning" ? "warn" : "default"}
          className="performance-advisor-brief-item-tone"
        >
          {toToneLabel(item.tone)}
        </StatusChip>
      </header>
      <p>{item.detail}</p>
      <div className="performance-advisor-brief-evidence-row">
        {item.evidenceRefs.map((evidenceRef) => (
          <EvidenceChip
            key={`${item.headline}-${evidenceRef.metricLabel}-${evidenceRef.sourceSurface}`}
            evidenceRef={evidenceRef}
            onSelectMode={onSelectMode}
          />
        ))}
      </div>
    </article>
  );
}
