"use client";

import { useMemo, useState } from "react";

import { AnalyticsTable } from "@/design-system";

import { formatCurrency, formatPct } from "../formatters";
import type { PortfolioAllocationView } from "../types";

const PREFERRED_DIMENSION_ORDER = ["asset_class", "currency", "sector"] as const;

export default function PortfolioAllocationPanel({
  allocationViews,
  baseCurrency,
}: {
  allocationViews: PortfolioAllocationView[];
  baseCurrency: string;
}) {
  const orderedViews = useMemo(() => {
    return [...allocationViews].sort((left, right) => {
      const leftIndex = PREFERRED_DIMENSION_ORDER.indexOf(
        left.dimension as (typeof PREFERRED_DIMENSION_ORDER)[number]
      );
      const rightIndex = PREFERRED_DIMENSION_ORDER.indexOf(
        right.dimension as (typeof PREFERRED_DIMENSION_ORDER)[number]
      );

      return (
        (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
      );
    });
  }, [allocationViews]);

  const [activeDimension, setActiveDimension] = useState<string>(
    orderedViews[0]?.dimension ?? "asset_class"
  );

  const activeView =
    orderedViews.find((view) => view.dimension === activeDimension) ?? orderedViews[0] ?? null;

  if (!activeView || !activeView.buckets.length) {
    return (
      <div className="portfolio-empty-state portfolio-empty-state-illustrated">
        <div className="portfolio-empty-illustration" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <strong>No allocations available yet.</strong>
        <p className="muted">
          Add funded and priced holdings to generate allocation views across asset class,
          currency, and sector.
        </p>
      </div>
    );
  }

  return (
    <div className="portfolio-allocation-panel">
      <div className="portfolio-segmented-control" role="tablist" aria-label="Allocation views">
        {orderedViews.map((view) => {
          const isActive = view.dimension === activeView.dimension;
          return (
            <button
              key={view.dimension}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={
                isActive
                  ? "portfolio-segmented-control-button portfolio-segmented-control-button-active"
                  : "portfolio-segmented-control-button"
              }
              onClick={() => setActiveDimension(view.dimension)}
            >
              {formatDimensionLabel(view.dimension)}
            </button>
          );
        })}
      </div>

      <AnalyticsTable
        ariaLabel={`${activeView.dimension} allocation`}
        columns={[
          { key: "bucket", label: formatDimensionLabel(activeView.dimension) },
          { key: "positions", label: "Positions", align: "right" },
          { key: "value", label: "Market Value", align: "right" },
          { key: "weight", label: "Weight", align: "right" },
        ]}
        rows={activeView.buckets.map((bucket) => ({
          key: `${activeView.dimension}-${bucket.bucket}`,
          cells: [
            bucket.bucket,
            bucket.position_count,
            formatCurrency(bucket.market_value_base, baseCurrency),
            formatPct(bucket.weight_pct),
          ],
        }))}
      />
    </div>
  );
}

function formatDimensionLabel(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
