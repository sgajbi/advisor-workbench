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
    <article
      className={`performance-advisor-brief-item performance-advisor-brief-item-${item.tone}`}
    >
      <header className="performance-advisor-brief-item-header">
        <div className="performance-advisor-brief-item-copy">
          <h4>{item.headline}</h4>
          <p>{item.detail}</p>
        </div>
        <StatusChip
          tone={item.tone === "warning" ? "warn" : "default"}
          className="performance-advisor-brief-item-tone"
        >
          {toToneLabel(item.tone)}
        </StatusChip>
      </header>
      <div className="performance-advisor-brief-item-support">
        <span className="performance-advisor-brief-item-support-label">Supporting metrics</span>
      </div>
      <div className="performance-advisor-brief-evidence-row" aria-label="Supporting metrics">
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
