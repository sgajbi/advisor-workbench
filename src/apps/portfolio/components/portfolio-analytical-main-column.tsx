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
        {health}
        {changes}
        {drilldown}
      </section>
    </>
  );
}
