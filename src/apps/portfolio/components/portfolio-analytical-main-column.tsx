"use client";

import type { ReactNode } from "react";

export default function PortfolioAnalyticalMainColumn({
  summaryHeader,
  exceptions,
  insights,
  health,
  changes,
  drilldown,
}: {
  summaryHeader: ReactNode;
  exceptions: ReactNode;
  insights: ReactNode;
  health: ReactNode;
  changes: ReactNode;
  drilldown: ReactNode;
}) {
  return (
    <>
      <section className="portfolio-summary-cluster" aria-label="Portfolio analytical overview">
        {summaryHeader}
        {exceptions}
        {insights}
      </section>

      <section className="portfolio-detailed-cluster" aria-label="Portfolio analytical detail">
        {(health || changes) ? (
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
        ) : null}
        {drilldown ? (
          <div className="portfolio-detailed-supporting-shell">
            <div className="portfolio-analytical-shell-header portfolio-analytical-shell-header-subdued">
              <span>Supporting records</span>
              <strong>Underlying grids and forward-liquidity detail on demand</strong>
            </div>
            {drilldown}
          </div>
        ) : null}
      </section>
    </>
  );
}
