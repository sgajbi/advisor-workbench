import { SemanticBadge } from "@/design-system";
import type { PerformanceAdvisorBriefItem } from "../../advisor-brief-view-model";
import type { PerformanceWorkspaceMode } from "../performance-workspace-mode-switch";

import LotusEvidenceChip from "./lotus-evidence-chip";

function toToneLabel(tone: PerformanceAdvisorBriefItem["tone"]) {
  if (tone === "warning") {
    return "Review";
  }
  if (tone === "positive") {
    return "Supported";
  }
  return "Source-grounded";
}

export default function LotusTalkingPointCard({
  item,
  onSelectMode,
  variant = "brief",
}: {
  item: PerformanceAdvisorBriefItem;
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
  variant?: "brief" | "risk";
}) {
  return (
    <article
      className={[
        "lotus-talking-point-card",
        `lotus-talking-point-card-${variant}`,
        `performance-advisor-brief-item performance-advisor-brief-item-${item.tone}`,
      ].join(" ")}
    >
      <header className="lotus-talking-point-card-header performance-advisor-brief-item-header">
        <div className="lotus-talking-point-card-copy performance-advisor-brief-item-copy">
          <h4>{item.headline}</h4>
          <p>{item.detail}</p>
        </div>
        <SemanticBadge
          tone={item.tone === "warning" ? "warn" : item.tone === "positive" ? "success" : "default"}
          className="performance-advisor-brief-item-tone"
        >
          {toToneLabel(item.tone)}
        </SemanticBadge>
      </header>
      <div className="performance-advisor-brief-item-support">
        <span className="performance-advisor-brief-item-support-label">Supporting metrics</span>
      </div>
      <div className="performance-advisor-brief-evidence-row" aria-label="Supporting metrics">
        {item.evidenceRefs.map((evidenceRef) => (
          <LotusEvidenceChip
            key={`${item.headline}-${evidenceRef.metricLabel}-${evidenceRef.sourceSurface}`}
            evidenceRef={evidenceRef}
            onSelectMode={onSelectMode}
          />
        ))}
      </div>
    </article>
  );
}
