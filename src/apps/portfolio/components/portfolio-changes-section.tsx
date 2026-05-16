"use client";

import { ActionLink, SectionHeader } from "@/design-system";

import { formatPortfolioPeriodContext } from "./portfolio-analytical-section-state";
import type { PortfolioChangesSectionProps } from "./portfolio-analytical-section-types";

export function PortfolioChangesSection({
  workspace,
  context,
  showChanges,
}: PortfolioChangesSectionProps) {
  if (!showChanges) {
    return null;
  }

  const portfolioId = encodeURIComponent(workspace.portfolio.portfolio_id);

  return (
    <section
      id="portfolio-changes"
      className="portfolio-workspace-section portfolio-detailed-cluster-section portfolio-income-handoff-section"
    >
      <SectionHeader
        title="Income & Activity"
        subtitle={`Income classification and source-defined cash movement have moved to a dedicated workspace for ${formatPortfolioPeriodContext(
          context
        )}.`}
        actions={
          <ActionLink href={`/income?portfolioId=${portfolioId}`}>
            Open Income &amp; Activity
          </ActionLink>
        }
      />
      <div className="portfolio-income-handoff-card">
        <div>
          <span>Dedicated record screen</span>
          <strong>Income, activity buckets, cash movement, and source posture</strong>
        </div>
        <p>
          The detailed portfolio view now routes income and activity review to the
          source-backed record screen instead of duplicating the same figures inside the
          summary workflow.
        </p>
      </div>
    </section>
  );
}
