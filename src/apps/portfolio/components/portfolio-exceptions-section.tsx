"use client";

import { AnalyticsModule, MetricRow, Panel, SectionHeader } from "@/design-system";

import type { PortfolioWorkspace } from "../types";
import { getEvidenceServiceLabel } from "../workspace-config";

export default function PortfolioExceptionsSection({ workspace }: { workspace: PortfolioWorkspace }) {
  return (
    <section
      id="portfolio-attention"
      className="portfolio-workspace-section portfolio-summary-cluster-section"
    >
      <SectionHeader
        title={workspace.partial_failures.length ? "Critical Exceptions and Blockers" : "Exceptions"}
        subtitle={
          workspace.partial_failures.length
            ? "Unresolved issues affecting reporting, valuation, or operations."
            : "Current reporting and operational exception status."
        }
      />
      {workspace.partial_failures.length ? (
        <AnalyticsModule
          title="Reporting Coverage"
          subtitle="Issues affecting reporting, valuation, or portfolio operations."
        >
          <MetricRow label="Active exceptions" value={workspace.partial_failures.length} />
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
      ) : (
        <Panel>
          <div className="portfolio-empty-state">
            <strong>No active exceptions</strong>
            <p className="muted">Reporting and operational checks are currently clear.</p>
          </div>
        </Panel>
      )}
    </section>
  );
}
