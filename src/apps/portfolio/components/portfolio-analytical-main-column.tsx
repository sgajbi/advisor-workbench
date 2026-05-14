"use client";

import type { ReactNode } from "react";

export default function PortfolioAnalyticalMainColumn({
  summaryHeader,
  toolbar,
  exceptions,
  insights,
  health,
  changes,
}: {
  summaryHeader: ReactNode;
  toolbar?: ReactNode;
  exceptions?: ReactNode;
  insights: ReactNode;
  health?: ReactNode;
  changes?: ReactNode;
}) {
  const hasDetailedContent = Boolean(health || changes);

  return (
    <>
      <section className="portfolio-summary-cluster" aria-label="Portfolio analytical overview">
        {summaryHeader}
        {insights}
        {toolbar}
        {exceptions}
      </section>

      {hasDetailedContent ? (
        <section className="portfolio-detailed-cluster" aria-label="Portfolio analytical detail">
          <div className="portfolio-detailed-primary-shell">
            <div className="portfolio-analytical-shell-header portfolio-analytical-shell-header-quiet">
              <span>Decision review</span>
              <strong>Health, liquidity, performance, and recent flows first</strong>
            </div>
            <div className="portfolio-detailed-primary-stack">
              {health}
              {changes}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
