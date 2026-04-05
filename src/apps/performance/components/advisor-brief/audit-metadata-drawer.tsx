import type { PerformanceAdvisorBriefAudit } from "../../advisor-brief-view-model";

export default function AuditMetadataDrawer({
  audit,
}: {
  audit: PerformanceAdvisorBriefAudit;
}) {
  return (
    <details className="performance-advisor-brief-audit-drawer">
      <summary>Audit metadata</summary>
      <dl className="performance-advisor-brief-audit-grid">
        <div>
          <dt>Generated</dt>
          <dd>{audit.generatedAt}</dd>
        </div>
        <div>
          <dt>Provider Mode</dt>
          <dd>{audit.providerMode}</dd>
        </div>
        <div>
          <dt>Provider ID</dt>
          <dd>{audit.providerId ?? "Not reported"}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{audit.modelId ?? "Not reported"}</dd>
        </div>
        <div>
          <dt>Source Refs</dt>
          <dd>{audit.sourceRefs.length}</dd>
        </div>
        <div>
          <dt>Adapter</dt>
          <dd>{audit.adapterKind ?? "Not reported"}</dd>
        </div>
        <div>
          <dt>Review Mode</dt>
          <dd>{audit.stubbed ? "Preview" : "Live"}</dd>
        </div>
      </dl>
    </details>
  );
}
