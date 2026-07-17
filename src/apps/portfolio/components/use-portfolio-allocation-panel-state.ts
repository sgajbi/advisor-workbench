"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getPortfolioAllocationViews,
  type PortfolioLookThroughMode,
} from "../api";
import {
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
import type { AllocationExposureMode } from "../portfolio-allocation-drilldown-view-model";

export type PortfolioAllocationPanelState = ReturnType<
  typeof usePortfolioAllocationPanelState
>;

export function usePortfolioAllocationPanelState({
  portfolioId,
  allocationViews,
  asOfDate,
  reportingCurrency,
  selectedAllocation,
  onSelectionChange,
  onExposureModeChange,
}: {
  portfolioId: string;
  allocationViews: PortfolioAllocationView[];
  asOfDate: string;
  reportingCurrency: string;
  selectedAllocation: PortfolioAllocationSelection | null;
  onSelectionChange: (selection: PortfolioAllocationSelection | null) => void;
  onExposureModeChange?: (mode: AllocationExposureMode) => void;
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
  const [activeDimension, setActiveDimension] = useState<AllocationDimension>(
    getFirstAvailableAllocationDimension(allocationViews),
  );
  const [chartType, setChartType] = useState<AllocationChartType>("donut");
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);

  const viewsByDimension = useMemo(() => {
    return new Map(
      resolvedAllocationViews.map((view) => [view.dimension, view]),
    );
  }, [resolvedAllocationViews]);

  const firstAvailableDimension =
    ALLOCATION_DIMENSIONS.find((dimension) =>
      viewsByDimension.has(dimension.key),
    )?.key ?? "asset_class";

  useEffect(() => {
    setActiveDimension(firstAvailableDimension);
  }, [firstAvailableDimension]);

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
  const exposureMode: AllocationExposureMode =
    lookThroughLabel === "Expanded exposure" ? "expanded" : "direct";

  useEffect(() => {
    onExposureModeChange?.(exposureMode);
  }, [exposureMode, onExposureModeChange]);

  function changeDimension(nextDimension: AllocationDimension) {
    setActiveDimension(nextDimension);
    setHoveredBucket(null);
    onSelectionChange(null);
  }

  function selectBucket(bucket: string) {
    if (exposureMode === "expanded") {
      return;
    }
    onSelectionChange(
      selectedBucket === bucket
        ? null
        : { dimension: activeDimension, bucket },
    );
  }

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

    const nextExposureMode: AllocationExposureMode =
      nextRequestedMode === "prefer_look_through" &&
      normalizeLookThroughMode(
        nextLookThrough?.effective_mode,
        nextRequestedMode,
      ) === "prefer_look_through"
        ? "expanded"
        : "direct";

    if (nextExposureMode === "expanded") {
      onSelectionChange(null);
      return;
    }

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

  async function toggleLookThrough() {
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
  }

  return {
    viewsByDimension,
    activeDimension,
    activeDimensionLabel,
    buckets,
    totalWeight,
    chartType,
    setChartType,
    hoveredBucket,
    setHoveredBucket,
    selectedBucket,
    lookThroughRequestedMode,
    lookThroughLabel,
    lookThroughSupported,
    lookThroughBusy,
    lookThroughProbeComplete,
    holdingsDrilldownAvailable: exposureMode === "direct",
    changeDimension,
    selectBucket,
    toggleLookThrough,
  };
}

function getFirstAvailableAllocationDimension(
  allocationViews: PortfolioAllocationView[],
): AllocationDimension {
  const availableDimensions = new Set(
    allocationViews.map((view) => view.dimension),
  );
  return (
    ALLOCATION_DIMENSIONS.find((dimension) =>
      availableDimensions.has(dimension.key),
    )?.key ?? "asset_class"
  );
}
