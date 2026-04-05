import type { PerformanceAdvisorBriefAudit } from "../../advisor-brief-view-model";

import AuditMetadataDrawer from "./audit-metadata-drawer";

export default function BriefProvenanceStrip({
  audit,
}: {
  audit: PerformanceAdvisorBriefAudit;
}) {
  return (
    <section className="performance-advisor-brief-provenance-strip" aria-label="Brief provenance">
      <div className="performance-advisor-brief-provenance-summary">
        <span>Generated {audit.generatedAt}</span>
        <span>Provider {audit.providerMode}</span>
        <span>{audit.sourceRefs.length} source refs</span>
        <span>{audit.stubbed ? "Review mode" : "Live mode"}</span>
      </div>
      <AuditMetadataDrawer audit={audit} />
    </section>
  );
}
