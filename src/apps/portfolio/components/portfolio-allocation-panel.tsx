"use client";

import { useEffect, useMemo, useState } from "react";

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
  ALLOCATION_DIMENSIONS,
  formatAllocationDimensionLabel,
  isExpandedLookThroughSupported,
  normalizeLookThroughMode,
  type AllocationChartType,
  type AllocationDimension,
} from "../portfolio-allocation-view-model";
import type {
  PortfolioAllocationLookThrough,
  PortfolioAllocationSelection,
  PortfolioAllocationView,
} from "../types";
import {
  AllocationBarChart,
  AllocationDonutChart,
  AllocationEmptyState,
  AllocationRankedList,
  AllocationTableChart,
} from "./portfolio-allocation-visuals";

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
              <AllocationRankedList
                activeDimension={activeDimension}
                buckets={buckets}
                baseCurrency={baseCurrency}
                hoveredBucket={hoveredBucket}
                selectedBucket={selectedBucket}
                onHover={setHoveredBucket}
                onSelectionChange={onSelectionChange}
              />
            ) : null}
          </div>
        ) : (
          <AllocationEmptyState dimensionLabel={activeDimensionLabel} />
        )}
      </div>
    </div>
  );
}
