"use client";

import type { ReactNode } from "react";

export default function PortfolioAnalyticalMainColumn({
  summaryHeader,
  toolbar,
  exceptions,
  insights,
}: {
  summaryHeader: ReactNode;
  toolbar?: ReactNode;
  exceptions?: ReactNode;
  insights: ReactNode;
}) {
  return (
    <section className="portfolio-summary-cluster" aria-label="Portfolio analytical overview">
      {summaryHeader}
      {insights}
      {toolbar}
      {exceptions}
    </section>
  );
}
