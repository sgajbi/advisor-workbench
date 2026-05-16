"use client";

import { type KeyboardEvent } from "react";

import {
  ALLOCATION_COLORS,
  describeAllocationArc,
} from "../portfolio-allocation-view-model";
import { formatCurrency, formatPct } from "../formatters";
import type {
  PortfolioAllocationSelection,
  PortfolioAllocationView,
} from "../types";

function handleInteractiveKeyPress(
  event: KeyboardEvent<Element>,
  onActivate: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
}

export function AllocationDonutChart({
  buckets,
  totalWeight,
  hoveredBucket,
  selectedBucket,
  onHover,
  onSelect,
}: {
  buckets: PortfolioAllocationView["buckets"];
  totalWeight: number;
  hoveredBucket: string | null;
  selectedBucket: string | null;
  onHover: (bucket: string | null) => void;
  onSelect: (bucket: string) => void;
}) {
  let cumulativeAngle = -90;

  return (
    <div
      className="portfolio-allocation-chart"
      role="img"
      aria-label="Allocation donut chart"
    >
      <svg viewBox="0 0 220 220" className="portfolio-allocation-chart-svg">
        <circle
          cx="110"
          cy="110"
          r="58"
          className="portfolio-allocation-chart-track"
        />
        {buckets.map((bucket, index) => {
          const portion =
            totalWeight > 0
              ? Math.max(bucket.weight_pct ?? 0, 0) / totalWeight
              : 0;
          const startAngle = cumulativeAngle;
          const endAngle = startAngle + portion * 360;
          cumulativeAngle = endAngle;
          const path = describeAllocationArc(
            110,
            110,
            86,
            58,
            startAngle,
            endAngle,
          );
          const isHovered = hoveredBucket === bucket.bucket;
          const isSelected = selectedBucket === bucket.bucket;
          return (
            <path
              key={bucket.bucket}
              d={path}
              fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}
              role="button"
              tabIndex={0}
              aria-label={`${bucket.bucket}: ${formatPct(bucket.weight_pct)}. Select to filter holdings.`}
              className={
                isSelected
                  ? "portfolio-allocation-chart-segment portfolio-allocation-chart-segment-selected"
                  : isHovered
                    ? "portfolio-allocation-chart-segment portfolio-allocation-chart-segment-hovered"
                    : "portfolio-allocation-chart-segment"
              }
              onMouseEnter={() => onHover(bucket.bucket)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(bucket.bucket)}
              onKeyDown={(event) =>
                handleInteractiveKeyPress(event, () => onSelect(bucket.bucket))
              }
            >
              <title>{`${bucket.bucket}: ${formatPct(bucket.weight_pct)}`}</title>
            </path>
          );
        })}
        <circle
          cx="110"
          cy="110"
          r="50"
          className="portfolio-allocation-chart-core"
        />
        <text
          x="110"
          y="104"
          textAnchor="middle"
          className="portfolio-allocation-chart-center-label"
        >
          Allocation
        </text>
        <text
          x="110"
          y="124"
          textAnchor="middle"
          className="portfolio-allocation-chart-center-value"
        >
          {buckets.length} buckets
        </text>
      </svg>
    </div>
  );
}

export function AllocationBarChart({
  buckets,
  hoveredBucket,
  selectedBucket,
  onHover,
  onSelect,
}: {
  buckets: PortfolioAllocationView["buckets"];
  hoveredBucket: string | null;
  selectedBucket: string | null;
  onHover: (bucket: string | null) => void;
  onSelect: (bucket: string) => void;
}) {
  const maxWeight = Math.max(
    ...buckets.map((bucket) => bucket.weight_pct ?? 0),
    0,
  );

  return (
    <div
      className="portfolio-allocation-chart portfolio-allocation-bar-chart"
      aria-label="Allocation bar chart"
    >
      {buckets.map((bucket, index) => {
        const width =
          maxWeight > 0
            ? `${((bucket.weight_pct ?? 0) / maxWeight) * 100}%`
            : "0%";
        const isHovered = hoveredBucket === bucket.bucket;
        const isSelected = selectedBucket === bucket.bucket;
        return (
          <button
            key={bucket.bucket}
            type="button"
            aria-label={`${bucket.bucket}: ${formatPct(bucket.weight_pct)}. Select to filter holdings.`}
            title={`${bucket.bucket}: ${formatPct(bucket.weight_pct)}`}
            className={
              isSelected
                ? "portfolio-allocation-bar-row portfolio-allocation-bar-row-selected"
                : isHovered
                  ? "portfolio-allocation-bar-row portfolio-allocation-bar-row-hovered"
                  : "portfolio-allocation-bar-row"
            }
            onMouseEnter={() => onHover(bucket.bucket)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(bucket.bucket)}
          >
            <span className="portfolio-allocation-bar-label">
              {bucket.bucket}
            </span>
            <span className="portfolio-allocation-bar-track">
              <span
                className="portfolio-allocation-bar-fill"
                style={{
                  width,
                  backgroundColor:
                    ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
                }}
              />
            </span>
            <span className="portfolio-allocation-bar-value">
              {formatPct(bucket.weight_pct)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AllocationTableChart({
  buckets,
  hoveredBucket,
  selectedBucket,
  onHover,
  onSelect,
}: {
  buckets: PortfolioAllocationView["buckets"];
  hoveredBucket: string | null;
  selectedBucket: string | null;
  onHover: (bucket: string | null) => void;
  onSelect: (bucket: string) => void;
}) {
  return (
    <div
      className="portfolio-allocation-chart portfolio-allocation-table-chart"
      aria-label="Allocation table chart"
    >
      {buckets.map((bucket, index) => {
        const isHovered = hoveredBucket === bucket.bucket;
        const isSelected = selectedBucket === bucket.bucket;
        return (
          <button
            key={bucket.bucket}
            type="button"
            aria-label={`${bucket.bucket}: ${formatPct(bucket.weight_pct)}. Select to filter holdings.`}
            title={`${bucket.bucket}: ${formatPct(bucket.weight_pct)}`}
            className={
              isSelected
                ? "portfolio-allocation-table-row portfolio-allocation-table-row-selected"
                : isHovered
                  ? "portfolio-allocation-table-row portfolio-allocation-table-row-hovered"
                  : "portfolio-allocation-table-row"
            }
            onMouseEnter={() => onHover(bucket.bucket)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(bucket.bucket)}
          >
            <span
              className="portfolio-allocation-table-dot"
              style={{
                backgroundColor:
                  ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
              }}
            />
            <span>{bucket.bucket}</span>
            <span>{formatPct(bucket.weight_pct)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AllocationRankedList({
  activeDimension,
  buckets,
  baseCurrency,
  hoveredBucket,
  selectedBucket,
  onHover,
  onSelectionChange,
}: {
  activeDimension: PortfolioAllocationSelection["dimension"];
  buckets: PortfolioAllocationView["buckets"];
  baseCurrency: string;
  hoveredBucket: string | null;
  selectedBucket: string | null;
  onHover: (bucket: string | null) => void;
  onSelectionChange: (selection: PortfolioAllocationSelection | null) => void;
}) {
  return (
    <div className="portfolio-allocation-ranked">
      <div className="portfolio-allocation-ranked-header">
        <span>Dimension</span>
        <span className="portfolio-allocation-ranked-number">
          Market Value
        </span>
        <span className="portfolio-allocation-ranked-number">Weight</span>
        <span className="portfolio-allocation-ranked-number">Positions</span>
      </div>
      <div className="portfolio-allocation-ranked-body">
        {buckets
          .slice()
          .sort(
            (left, right) =>
              (right.market_value_base ?? 0) - (left.market_value_base ?? 0),
          )
          .map((bucket, index) => {
            const isHovered = hoveredBucket === bucket.bucket;
            const isSelected = selectedBucket === bucket.bucket;
            return (
              <button
                key={`${activeDimension}-${bucket.bucket}`}
                type="button"
                aria-label={`${bucket.bucket}: ${formatCurrency(bucket.market_value_base, baseCurrency)}, ${formatPct(bucket.weight_pct)}, ${bucket.position_count} positions. Filter holdings.`}
                title={`${bucket.bucket}: ${formatPct(bucket.weight_pct)}`}
                className={
                  isSelected
                    ? "portfolio-allocation-ranked-row portfolio-allocation-ranked-row-selected"
                    : isHovered
                      ? "portfolio-allocation-ranked-row portfolio-allocation-ranked-row-hovered"
                      : "portfolio-allocation-ranked-row"
                }
                onMouseEnter={() => onHover(bucket.bucket)}
                onMouseLeave={() => onHover(null)}
                onClick={() =>
                  onSelectionChange(
                    isSelected
                      ? null
                      : {
                          dimension: activeDimension,
                          bucket: bucket.bucket,
                        },
                  )
                }
              >
                <span className="portfolio-allocation-ranked-dimension">
                  <i
                    aria-hidden="true"
                    style={{
                      backgroundColor:
                        ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
                    }}
                  />
                  {bucket.bucket}
                </span>
                <span className="portfolio-allocation-ranked-number">
                  {formatCurrency(bucket.market_value_base, baseCurrency)}
                </span>
                <span className="portfolio-allocation-ranked-number">
                  {formatPct(bucket.weight_pct)}
                </span>
                <span className="portfolio-allocation-ranked-number">
                  {bucket.position_count}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}

export function AllocationEmptyState({
  dimensionLabel,
}: {
  dimensionLabel: string;
}) {
  return (
    <div className="portfolio-allocation-empty">
      <div className="portfolio-allocation-empty-chart" aria-hidden="true">
        <div className="portfolio-allocation-empty-ring" />
      </div>
      <div className="portfolio-allocation-empty-copy">
        <strong>{dimensionLabel} allocation is not available yet</strong>
        <p className="muted">
          This dimension requires funded holdings with current valuations before
          a reliable composition view can be shown.
        </p>
        <p className="muted">
          Book positions and publish prices to generate allocation views.
        </p>
      </div>
    </div>
  );
}
