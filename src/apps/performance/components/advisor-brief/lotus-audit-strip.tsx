import type { PerformanceAdvisorBriefAudit } from "../../advisor-brief-view-model";

import AuditMetadataDrawer from "./audit-metadata-drawer";

function buildExecutionSummary(audit: PerformanceAdvisorBriefAudit): string {
  const parts = [audit.providerMode];
  if (audit.providerId) {
    parts.push(audit.providerId);
  }
  if (audit.modelId) {
    parts.push(audit.modelId);
  }
  return parts.join(" • ");
}

export default function LotusAuditStrip({
  audit,
}: {
  audit: PerformanceAdvisorBriefAudit;
}) {
  return (
    <section className="lotus-audit-strip performance-advisor-brief-provenance-strip" aria-label="Brief provenance">
      <div className="performance-advisor-brief-provenance-summary">
        <span>Generated {audit.generatedAt}</span>
        <span>Execution {buildExecutionSummary(audit)}</span>
        <span>{audit.sourceRefs.length} source refs</span>
        <span>{audit.stubbed ? "Review mode" : "Live mode"}</span>
      </div>
      <AuditMetadataDrawer audit={audit} />
    </section>
  );
}
