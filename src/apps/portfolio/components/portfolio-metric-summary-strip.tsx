"use client";

import type { ReactNode } from "react";

export type PortfolioMetricSummaryItem = {
  label: string;
  value: ReactNode;
};

export default function PortfolioMetricSummaryStrip({
  items,
  ariaLabel,
}: {
  items: PortfolioMetricSummaryItem[];
  ariaLabel: string;
}) {
  return (
    <div className="portfolio-summary-pair-strip" role="group" aria-label={ariaLabel}>
      {items.map((item) => (
        <div key={item.label} className="portfolio-summary-pair-stat">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
