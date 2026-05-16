"use client";

import { type KeyboardEvent, useEffect, useMemo, useState } from "react";

import {
  WorkbenchSegmentedControl,
  WorkbenchSummaryToolbar,
} from "@/design-system";

import {
  getPortfolioAllocationViews,
  type PortfolioLookThroughMode,
} from "../api";
import {
  ALLOCATION_CHART_TYPES,
  ALLOCATION_COLORS,
  ALLOCATION_DIMENSIONS,
  describeAllocationArc,
  formatAllocationDimensionLabel,
  isExpandedLookThroughSupported,
  normalizeLookThroughMode,
  type AllocationChartType,
  type AllocationDimension,
} from "../portfolio-allocation-view-model";
import { formatCurrency, formatPct } from "../formatters";
import type {
  PortfolioAllocationLookThrough,
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

export default function PortfolioAllocationPanel({
  portfolioId,
  allocationViews,
  baseCurrency,
  asOfDate,
  reportingCurrency,
  compact = false,
  selectedAllocation,
  onSelectionChange,
}: {
  portfolioId: string;
  allocationViews: PortfolioAllocationView[];
  baseCurrency: string;
  asOfDate: string;
  reportingCurrency: string;
  compact?: boolean;
  selectedAllocation: PortfolioAllocationSelection | null;
  onSelectionChange: (selection: PortfolioAllocationSelection | null) => void;
}) {
  const [resolvedAllocationViews, setResolvedAllocationViews] =
    useState<PortfolioAllocationView[]>(allocationViews);
  const [lookThroughRequestedMode, setLookThroughRequestedMode] =
    useState<PortfolioLookThroughMode>("direct_only");
  const [lookThroughEffectiveMode, setLookThroughEffectiveMode] =
    useState<PortfolioLookThroughMode>("direct_only");
  const [lookThroughSupported, setLookThroughSupported] = useState(false);
  const [lookThroughBusy, setLookThroughBusy] = useState(false);
  const [lookThroughProbeComplete, setLookThroughProbeComplete] =
    useState(false);
  const [cachedLookThroughResponse, setCachedLookThroughResponse] = useState<{
    views: PortfolioAllocationView[];
    lookThrough: PortfolioAllocationLookThrough | null;
  } | null>(null);

  const viewsByDimension = useMemo(() => {
    return new Map(
      resolvedAllocationViews.map((view) => [view.dimension, view]),
    );
  }, [resolvedAllocationViews]);

  const firstAvailableDimension =
    ALLOCATION_DIMENSIONS.find((dimension) =>
      viewsByDimension.has(dimension.key),
    )?.key ?? "asset_class";

  const [activeDimension, setActiveDimension] = useState<AllocationDimension>(
    firstAvailableDimension,
  );
  const [chartType, setChartType] = useState<AllocationChartType>("donut");
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResolvedAllocationViews(allocationViews);
    setLookThroughRequestedMode("direct_only");
    setLookThroughEffectiveMode("direct_only");
    setLookThroughSupported(false);
    setLookThroughBusy(true);
    setLookThroughProbeComplete(false);
    setCachedLookThroughResponse(null);

    void Promise.all([
      getPortfolioAllocationViews(portfolioId, {
        asOfDate,
        reportingCurrency,
        lookThroughMode: "direct_only",
      }),
      getPortfolioAllocationViews(portfolioId, {
        asOfDate,
        reportingCurrency,
        lookThroughMode: "prefer_look_through",
      }),
    ])
      .then(([directResponse, lookThroughResponse]) => {
        if (cancelled) {
          return;
        }

        if (directResponse?.views?.length) {
          setResolvedAllocationViews(directResponse.views);
        }
        setLookThroughEffectiveMode(
          normalizeLookThroughMode(
            directResponse?.look_through?.effective_mode,
          ),
        );

        const supportsExpandedLookThrough = isExpandedLookThroughSupported(
          lookThroughResponse?.look_through ?? null,
        );
        setLookThroughSupported(supportsExpandedLookThrough);
        if (supportsExpandedLookThrough && lookThroughResponse?.views?.length) {
          setCachedLookThroughResponse({
            views: lookThroughResponse.views,
            lookThrough: lookThroughResponse.look_through ?? null,
          });
        }
        setLookThroughProbeComplete(true);
      })
      .finally(() => {
        if (!cancelled) {
          setLookThroughBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [allocationViews, asOfDate, portfolioId, reportingCurrency]);

  useEffect(() => {
    if (viewsByDimension.has(activeDimension)) {
      return;
    }
    setActiveDimension(firstAvailableDimension);
  }, [activeDimension, firstAvailableDimension, viewsByDimension]);

  const activeView = viewsByDimension.get(activeDimension) ?? null;
  const buckets = activeView?.buckets ?? [];
  const activeDimensionLabel = formatAllocationDimensionLabel(activeDimension);
  const totalWeight =
    buckets.reduce(
      (sum, bucket) => sum + Math.max(bucket.weight_pct ?? 0, 0),
      0,
    ) || 0;

  const selectedBucket =
    selectedAllocation?.dimension === activeDimension
      ? selectedAllocation.bucket
      : null;

  const lookThroughLabel =
    lookThroughRequestedMode === "prefer_look_through" &&
    lookThroughEffectiveMode === "prefer_look_through"
      ? "Expanded exposure"
      : "Direct holdings";

  const syncAllocationViewState = (
    nextViews: PortfolioAllocationView[],
    nextRequestedMode: PortfolioLookThroughMode,
    nextLookThrough: PortfolioAllocationLookThrough | null | undefined,
  ) => {
    setResolvedAllocationViews(nextViews);
    setLookThroughRequestedMode(nextRequestedMode);
    setLookThroughEffectiveMode(
      normalizeLookThroughMode(
        nextLookThrough?.effective_mode,
        nextRequestedMode,
      ),
    );
    setHoveredBucket(null);

    if (!selectedAllocation) {
      return;
    }

    const matchingView = nextViews.find(
      (view) => view.dimension === selectedAllocation.dimension,
    );
    const bucketStillAvailable = matchingView?.buckets.some(
      (bucket) => bucket.bucket === selectedAllocation.bucket,
    );
    if (!bucketStillAvailable) {
      onSelectionChange(null);
    }
  };

  const toggleLookThrough = async () => {
    const nextMode: PortfolioLookThroughMode =
      lookThroughRequestedMode === "prefer_look_through"
        ? "direct_only"
        : "prefer_look_through";
    setLookThroughBusy(true);

    try {
      const response =
        nextMode === "prefer_look_through" && cachedLookThroughResponse
          ? {
              views: cachedLookThroughResponse.views,
              look_through: cachedLookThroughResponse.lookThrough,
            }
          : await getPortfolioAllocationViews(portfolioId, {
              asOfDate,
              reportingCurrency,
              lookThroughMode: nextMode,
            });

      if (response?.views?.length) {
        syncAllocationViewState(
          response.views,
          nextMode,
          response.look_through,
        );
      }
    } finally {
      setLookThroughBusy(false);
    }
  };

  return (
    <div
      className={
        compact
          ? "portfolio-allocation-panel portfolio-allocation-panel-compact"
          : "portfolio-allocation-panel"
      }
    >
      <WorkbenchSummaryToolbar className="portfolio-allocation-toolbar">
        <WorkbenchSegmentedControl
          value={activeDimension}
          onChange={(nextDimension) => {
            setActiveDimension(nextDimension);
            setHoveredBucket(null);
            onSelectionChange(null);
          }}
          options={ALLOCATION_DIMENSIONS.map((dimension) => {
            const isAvailable = viewsByDimension.has(dimension.key);
            return {
              key: dimension.key,
              label: dimension.label,
              disabled: !isAvailable,
              title: isAvailable
                ? dimension.label
                : `${dimension.label} pending source support`,
            };
          })}
          ariaLabel="Allocation dimensions"
        />

        <div className="portfolio-allocation-toolbar-actions">
          <WorkbenchSegmentedControl
            value={chartType}
            onChange={setChartType}
            options={ALLOCATION_CHART_TYPES.map((option) => ({
              key: option.key,
              label: option.label,
            }))}
            ariaLabel="Allocation chart types"
          />

          <button
            type="button"
            className="portfolio-allocation-toggle"
            disabled={!lookThroughSupported || lookThroughBusy}
            aria-disabled={!lookThroughSupported || lookThroughBusy}
            aria-pressed={lookThroughRequestedMode === "prefer_look_through"}
            aria-label={
              lookThroughSupported
                ? `Look-through ${lookThroughRequestedMode === "prefer_look_through" ? "on" : "off"}`
                : lookThroughProbeComplete
                  ? "Look-through unavailable for current portfolio snapshot"
                  : "Checking look-through support"
            }
            title={
              lookThroughSupported
                ? `Current allocation mode: ${lookThroughLabel}`
                : lookThroughProbeComplete
                  ? "Look-through is not available for the current portfolio snapshot"
                  : "Checking look-through support"
            }
            onClick={() => {
              void toggleLookThrough();
            }}
          >
            {lookThroughRequestedMode === "prefer_look_through"
              ? "Look-through on"
              : "Look-through off"}
          </button>
        </div>
      </WorkbenchSummaryToolbar>

      <div
        className="portfolio-analytics-canvas portfolio-allocation-card"
        role="tabpanel"
        aria-label={`${activeDimensionLabel} allocation view`}
      >
        <div className="portfolio-analytical-utility-header">
          <span>Current View</span>
          <strong>{`${activeDimensionLabel} • ${buckets.length} buckets • ${lookThroughLabel}`}</strong>
        </div>
        {buckets.length ? (
          <div className="portfolio-allocation-body">
            <div className="portfolio-allocation-visual">
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
                        : { dimension: activeDimension, bucket },
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
                        : { dimension: activeDimension, bucket },
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
                        : { dimension: activeDimension, bucket },
                    )
                  }
                />
              ) : null}
            </div>

            {!compact ? (
              <div className="portfolio-allocation-ranked">
                <div className="portfolio-allocation-ranked-header">
                  <span>Dimension</span>
                  <span className="portfolio-allocation-ranked-number">
                    Market Value
                  </span>
                  <span className="portfolio-allocation-ranked-number">
                    Weight
                  </span>
                  <span className="portfolio-allocation-ranked-number">
                    Positions
                  </span>
                </div>
                <div className="portfolio-allocation-ranked-body">
                  {buckets
                    .slice()
                    .sort(
                      (left, right) =>
                        (right.market_value_base ?? 0) -
                        (left.market_value_base ?? 0),
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
                                  ALLOCATION_COLORS[
                                    index % ALLOCATION_COLORS.length
                                  ],
                              }}
                            />
                            {bucket.bucket}
                          </span>
                          <span className="portfolio-allocation-ranked-number">
                            {formatCurrency(
                              bucket.market_value_base,
                              baseCurrency,
                            )}
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
            ) : null}
          </div>
        ) : (
          <AllocationEmptyState dimensionLabel={activeDimensionLabel} />
        )}
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

function AllocationEmptyState({ dimensionLabel }: { dimensionLabel: string }) {
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
