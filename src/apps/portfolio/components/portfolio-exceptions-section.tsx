"use client";

import { AnalyticsModule, MetricRow, SectionHeader } from "@/design-system";

import type { PortfolioWorkspace } from "../types";
import { PORTFOLIO_EVIDENCE_LABELS } from "../portfolio-terminology";
import { buildPortfolioSourceLimitations } from "../portfolio-summary-view-model";
import { getEvidenceServiceLabel } from "../workspace-config";

export default function PortfolioExceptionsSection({ workspace }: { workspace: PortfolioWorkspace }) {
  const limitations = buildPortfolioSourceLimitations(workspace);

  if (!limitations.length) {
    return null;
  }

  return (
    <section
      id="portfolio-attention"
      className="portfolio-workspace-section portfolio-summary-cluster-section"
    >
      <SectionHeader
        title={PORTFOLIO_EVIDENCE_LABELS.sourceLimitations}
        subtitle="Source evidence limitations that constrain this portfolio review."
      />
      <AnalyticsModule
        title={PORTFOLIO_EVIDENCE_LABELS.evidenceCoverage}
        subtitle="Source and supporting evidence that requires attention before client use."
      >
        <MetricRow label={PORTFOLIO_EVIDENCE_LABELS.activeLimitations} value={limitations.length} />
        <div className="portfolio-guidance-list">
          {limitations.map((limitation) => (
            <div
              key={limitation.key}
              className="portfolio-guidance-item"
            >
              <strong>{limitation.title}</strong>
              <p className="portfolio-evidence-copy">{limitation.detail}</p>
              <small className="muted">
                Source: {getEvidenceServiceLabel(limitation.sourceService)}
              </small>
            </div>
          ))}
        </div>
      </AnalyticsModule>
    </section>
  );
}
