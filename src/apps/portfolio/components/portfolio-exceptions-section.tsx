"use client";

import { AnalyticsModule, MetricRow, SectionHeader } from "@/design-system";

import type { PortfolioWorkspace } from "../types";
import { getEvidenceServiceLabel } from "../workspace-config";

export default function PortfolioExceptionsSection({ workspace }: { workspace: PortfolioWorkspace }) {
  if (!workspace.partial_failures.length) {
    return null;
  }

  return (
    <section
      id="portfolio-attention"
      className="portfolio-workspace-section portfolio-summary-cluster-section"
    >
      <SectionHeader
        title="Source Limitations"
        subtitle="Unresolved source issues that limit this portfolio review."
      />
      <AnalyticsModule
        title="Reporting Coverage"
        subtitle="Issues affecting reporting, valuation, or portfolio operations."
      >
        <MetricRow label="Active limitations" value={workspace.partial_failures.length} />
        <div className="portfolio-guidance-list">
          {workspace.partial_failures.map((failure) => (
            <div
              key={`${failure.source_service}-${failure.error_code}`}
              className="portfolio-guidance-item"
            >
              <strong>{getEvidenceServiceLabel(failure.source_service)}</strong>
              <p className="portfolio-evidence-copy">{failure.detail}</p>
            </div>
          ))}
        </div>
      </AnalyticsModule>
    </section>
  );
}
