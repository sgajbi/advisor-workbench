"use client";

import { type KeyboardEvent, useEffect, useMemo, useState } from "react";

import { formatCurrency, formatPct } from "../formatters";
import type {
  PortfolioAllocationSelection,
  PortfolioAllocationView,
} from "../types";

const DIMENSIONS = [
  { key: "asset_class", label: "Asset Class" },
  { key: "currency", label: "Currency" },
  { key: "sector", label: "Sector" },
  { key: "region", label: "Region" },
] as const;

const CHART_TYPES = [
  { key: "donut", label: "Donut" },
  { key: "bar", label: "Bar" },
  { key: "table", label: "Table" },
] as const;

const ALLOCATION_COLORS = [
  "#1d4ed8",
  "#0f766e",
  "#7c3aed",
  "#c2410c",
  "#475569",
  "#0f766e",
] as const;

type ChartType = (typeof CHART_TYPES)[number]["key"];
type AllocationDimension = (typeof DIMENSIONS)[number]["key"];

function handleInteractiveKeyPress(
  event: KeyboardEvent<Element>,
  onActivate: () => void
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
}

export default function PortfolioAllocationPanel({
  allocationViews,
  baseCurrency,
  compact = false,
  selectedAllocation,
  onSelectionChange,
}: {
  allocationViews: PortfolioAllocationView[];
  baseCurrency: string;
  compact?: boolean;
  selectedAllocation: PortfolioAllocationSelection | null;
  onSelectionChange: (selection: PortfolioAllocationSelection | null) => void;
}) {
  const viewsByDimension = useMemo(() => {
    return new Map(allocationViews.map((view) => [view.dimension, view]));
  }, [allocationViews]);

  const firstAvailableDimension =
    DIMENSIONS.find((dimension) => viewsByDimension.has(dimension.key))?.key ?? "asset_class";

  const [activeDimension, setActiveDimension] =
    useState<AllocationDimension>(firstAvailableDimension);
  const [chartType, setChartType] = useState<ChartType>("donut");
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);

  useEffect(() => {
    if (viewsByDimension.has(activeDimension)) {
      return;
    }
    setActiveDimension(firstAvailableDimension);
  }, [activeDimension, firstAvailableDimension, viewsByDimension]);

  const activeView = viewsByDimension.get(activeDimension) ?? null;
  const buckets = activeView?.buckets ?? [];
  const totalWeight =
    buckets.reduce((sum, bucket) => sum + Math.max(bucket.weight_pct ?? 0, 0), 0) || 0;

  const selectedBucket =
    selectedAllocation?.dimension === activeDimension ? selectedAllocation.bucket : null;

  return (
    <div
      className={
        compact
          ? "portfolio-allocation-panel portfolio-allocation-panel-compact"
          : "portfolio-allocation-panel"
      }
    >
      <div className="portfolio-allocation-toolbar">
        <div className="portfolio-segmented-control" role="tablist" aria-label="Allocation dimensions">
          {DIMENSIONS.map((dimension) => {
            const isAvailable = viewsByDimension.has(dimension.key);
            const isActive = activeDimension === dimension.key;
            return (
              <button
                key={dimension.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                disabled={!isAvailable}
                aria-disabled={!isAvailable}
                className={
                  isActive
                    ? "portfolio-segmented-control-button portfolio-segmented-control-button-active"
                    : "portfolio-segmented-control-button"
                }
                onClick={() => {
                  setActiveDimension(dimension.key);
                  setHoveredBucket(null);
                  onSelectionChange(null);
                }}
                title={isAvailable ? dimension.label : `${dimension.label} pending source support`}
              >
                {dimension.label}
              </button>
            );
          })}
        </div>

        <div className="portfolio-allocation-toolbar-actions">
          <div className="portfolio-segmented-control" role="tablist" aria-label="Allocation chart types">
            {CHART_TYPES.map((option) => {
              const isActive = chartType === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={
                    isActive
                      ? "portfolio-segmented-control-button portfolio-segmented-control-button-active"
                      : "portfolio-segmented-control-button"
                  }
                  onClick={() => setChartType(option.key)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="portfolio-allocation-toggle"
            disabled
            aria-disabled="true"
            aria-label="Look-through pending source support"
            title="Look-through pending source support"
          >
            Look-through
          </button>
        </div>
      </div>

      <div className="portfolio-allocation-body">
        <div className="portfolio-allocation-chart-card">
          {buckets.length ? (
            <>
              {chartType === "donut" ? (
                <AllocationDonutChart
                  buckets={buckets}
                  totalWeight={totalWeight}
                  hoveredBucket={hoveredBucket}
                  selectedBucket={selectedBucket}
                  onHover={setHoveredBucket}
                  onSelect={(bucket) =>
                    onSelectionChange(
                      selectedBucket === bucket
                        ? null
                        : { dimension: activeDimension, bucket }
                    )
                  }
                />
              ) : null}
              {chartType === "bar" ? (
                <AllocationBarChart
                  buckets={buckets}
                  hoveredBucket={hoveredBucket}
                  selectedBucket={selectedBucket}
                  onHover={setHoveredBucket}
                  onSelect={(bucket) =>
                    onSelectionChange(
                      selectedBucket === bucket
                        ? null
                        : { dimension: activeDimension, bucket }
                    )
                  }
                />
              ) : null}
              {chartType === "table" ? (
                <AllocationTableChart
                  buckets={buckets}
                  hoveredBucket={hoveredBucket}
                  selectedBucket={selectedBucket}
                  onHover={setHoveredBucket}
                  onSelect={(bucket) =>
                    onSelectionChange(
                      selectedBucket === bucket
                        ? null
                        : { dimension: activeDimension, bucket }
                    )
                  }
                />
              ) : null}
            </>
          ) : (
            <AllocationEmptyState dimensionLabel={formatDimensionLabel(activeDimension)} />
          )}
        </div>

        {!compact ? (
          <div className="portfolio-allocation-ranked">
          <div className="portfolio-allocation-ranked-header">
            <span>Dimension</span>
            <span>Market Value</span>
            <span>Weight</span>
            <span>Positions</span>
          </div>
          {buckets.length ? (
            <div className="portfolio-allocation-ranked-body">
              {buckets
                .slice()
                .sort(
                  (left, right) =>
                    (right.market_value_base ?? 0) - (left.market_value_base ?? 0)
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
                      onMouseEnter={() => setHoveredBucket(bucket.bucket)}
                      onMouseLeave={() => setHoveredBucket(null)}
                      onClick={() =>
                        onSelectionChange(
                          isSelected
                            ? null
                            : { dimension: activeDimension, bucket: bucket.bucket }
                        )
                      }
                    >
                      <span className="portfolio-allocation-ranked-dimension">
                        <i
                          aria-hidden="true"
                          style={{ backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] }}
                        />
                        {bucket.bucket}
                      </span>
                      <span>{formatCurrency(bucket.market_value_base, baseCurrency)}</span>
                      <span>{formatPct(bucket.weight_pct)}</span>
                      <span>{bucket.position_count}</span>
                    </button>
                  );
                })}
            </div>
          ) : (
            <div className="portfolio-allocation-ranked-empty">
              <strong>No allocation data yet</strong>
              <p className="muted">Book positions and publish prices to generate allocation views.</p>
            </div>
          )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AllocationDonutChart({
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
    <div className="portfolio-allocation-chart" role="img" aria-label="Allocation donut chart">
      <svg viewBox="0 0 220 220" className="portfolio-allocation-chart-svg">
        <circle cx="110" cy="110" r="58" className="portfolio-allocation-chart-track" />
        {buckets.map((bucket, index) => {
          const portion = totalWeight > 0 ? Math.max(bucket.weight_pct ?? 0, 0) / totalWeight : 0;
          const startAngle = cumulativeAngle;
          const endAngle = startAngle + portion * 360;
          cumulativeAngle = endAngle;
          const path = describeArc(110, 110, 86, 58, startAngle, endAngle);
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
              onKeyDown={(event) => handleInteractiveKeyPress(event, () => onSelect(bucket.bucket))}
            >
              <title>{`${bucket.bucket}: ${formatPct(bucket.weight_pct)}`}</title>
            </path>
          );
        })}
        <circle cx="110" cy="110" r="50" className="portfolio-allocation-chart-core" />
        <text x="110" y="104" textAnchor="middle" className="portfolio-allocation-chart-center-label">
          Allocation
        </text>
        <text x="110" y="124" textAnchor="middle" className="portfolio-allocation-chart-center-value">
          {buckets.length} buckets
        </text>
      </svg>
    </div>
  );
}

function AllocationBarChart({
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
  const maxWeight = Math.max(...buckets.map((bucket) => bucket.weight_pct ?? 0), 0);

  return (
    <div className="portfolio-allocation-chart portfolio-allocation-bar-chart" aria-label="Allocation bar chart">
      {buckets.map((bucket, index) => {
        const width = maxWeight > 0 ? `${((bucket.weight_pct ?? 0) / maxWeight) * 100}%` : "0%";
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
            <span className="portfolio-allocation-bar-label">{bucket.bucket}</span>
            <span className="portfolio-allocation-bar-track">
              <span
                className="portfolio-allocation-bar-fill"
                style={{
                  width,
                  backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
                }}
              />
            </span>
            <span className="portfolio-allocation-bar-value">{formatPct(bucket.weight_pct)}</span>
          </button>
        );
      })}
    </div>
  );
}

function AllocationTableChart({
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
    <div className="portfolio-allocation-chart portfolio-allocation-table-chart" aria-label="Allocation table chart">
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
              style={{ backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] }}
            />
            <span>{bucket.bucket}</span>
            <span>{formatPct(bucket.weight_pct)}</span>
          </button>
        );
      })}
    </div>
  );
}

function AllocationEmptyState({ dimensionLabel }: { dimensionLabel: string }) {
  return (
    <div className="portfolio-allocation-empty">
      <div className="portfolio-allocation-empty-chart" aria-hidden="true">
        <div className="portfolio-allocation-empty-ring" />
      </div>
      <div className="portfolio-allocation-empty-copy">
        <strong>No allocation data yet</strong>
        <p className="muted">{dimensionLabel} allocation becomes available once funded holdings are valued.</p>
        <p className="muted">Book positions and publish prices to generate allocation views.</p>
      </div>
    </div>
  );
}

function formatDimensionLabel(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: roundSvgCoordinate(centerX + radius * Math.cos(angleInRadians)),
    y: roundSvgCoordinate(centerY + radius * Math.sin(angleInRadians)),
  };
}

function describeArc(
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(x, y, outerRadius, endAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    startOuter.x,
    startOuter.y,
    "A",
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    0,
    endOuter.x,
    endOuter.y,
    "L",
    endInner.x,
    endInner.y,
    "A",
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    startInner.x,
    startInner.y,
    "Z",
  ].join(" ");
}

function roundSvgCoordinate(value: number): number {
  return Number(value.toFixed(4));
}
