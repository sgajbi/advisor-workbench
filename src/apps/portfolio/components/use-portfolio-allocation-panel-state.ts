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

type AllocationResolutionState = {
  sourceKey: string;
  resolvedAllocationViews: PortfolioAllocationView[];
  lookThroughRequestedMode: PortfolioLookThroughMode;
  lookThroughEffectiveMode: PortfolioLookThroughMode;
  lookThroughSupported: boolean;
  lookThroughBusy: boolean;
  lookThroughProbeComplete: boolean;
  cachedLookThroughResponse: {
    views: PortfolioAllocationView[];
    lookThrough: PortfolioAllocationLookThrough | null;
  } | null;
};

type ActiveDimensionState = {
  availableDimensionKey: string;
  dimension: AllocationDimension;
};

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
  const allocationSourceKey = useMemo(
    () =>
      JSON.stringify({
        portfolioId,
        asOfDate,
        reportingCurrency,
        allocationViews,
      }),
    [allocationViews, asOfDate, portfolioId, reportingCurrency],
  );
  const [allocationState, setAllocationState] =
    useState<AllocationResolutionState>(() =>
      buildInitialAllocationResolutionState(allocationSourceKey, allocationViews),
    );
  const activeAllocationState =
    allocationState.sourceKey === allocationSourceKey
      ? allocationState
      : buildInitialAllocationResolutionState(allocationSourceKey, allocationViews);
  const [chartType, setChartType] = useState<AllocationChartType>("donut");
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);

  const viewsByDimension = useMemo(() => {
    return new Map(
      activeAllocationState.resolvedAllocationViews.map((view) => [view.dimension, view]),
    );
  }, [activeAllocationState.resolvedAllocationViews]);

  const firstAvailableDimension =
    ALLOCATION_DIMENSIONS.find((dimension) =>
      viewsByDimension.has(dimension.key),
    )?.key ?? "asset_class";
  const availableDimensionKey = Array.from(viewsByDimension.keys()).sort().join("|");
  const [activeDimensionState, setActiveDimensionState] =
    useState<ActiveDimensionState>({
      availableDimensionKey,
      dimension: firstAvailableDimension,
    });
  const activeDimension =
    activeDimensionState.availableDimensionKey === availableDimensionKey &&
    viewsByDimension.has(activeDimensionState.dimension)
      ? activeDimensionState.dimension
      : firstAvailableDimension;

  useEffect(() => {
    let cancelled = false;

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

        const nextResolvedAllocationViews = directResponse?.views?.length
          ? directResponse.views
          : allocationViews;
        const nextLookThroughEffectiveMode = normalizeLookThroughMode(
          directResponse?.look_through?.effective_mode,
        );

        const supportsExpandedLookThrough = isExpandedLookThroughSupported(
          lookThroughResponse?.look_through ?? null,
        );
        setAllocationState({
          sourceKey: allocationSourceKey,
          resolvedAllocationViews: nextResolvedAllocationViews,
          lookThroughRequestedMode: "direct_only",
          lookThroughEffectiveMode: nextLookThroughEffectiveMode,
          lookThroughSupported: supportsExpandedLookThrough,
          lookThroughBusy: false,
          lookThroughProbeComplete: true,
          cachedLookThroughResponse:
            supportsExpandedLookThrough && lookThroughResponse?.views?.length
              ? {
                  views: lookThroughResponse.views,
                  lookThrough: lookThroughResponse.look_through ?? null,
                }
              : null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [allocationSourceKey, allocationViews, asOfDate, portfolioId, reportingCurrency]);

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
    activeAllocationState.lookThroughRequestedMode === "prefer_look_through" &&
    activeAllocationState.lookThroughEffectiveMode === "prefer_look_through"
      ? "Expanded exposure"
      : "Direct holdings";
  const exposureMode: AllocationExposureMode =
    lookThroughLabel === "Expanded exposure" ? "expanded" : "direct";

  useEffect(() => {
    onExposureModeChange?.(exposureMode);
  }, [exposureMode, onExposureModeChange]);

  function changeDimension(nextDimension: AllocationDimension) {
    setActiveDimensionState({
      availableDimensionKey,
      dimension: nextDimension,
    });
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
    setAllocationState({
      ...activeAllocationState,
      resolvedAllocationViews: nextViews,
      lookThroughRequestedMode: nextRequestedMode,
      lookThroughEffectiveMode: normalizeLookThroughMode(
        nextLookThrough?.effective_mode,
        nextRequestedMode,
      ),
      lookThroughBusy: false,
      lookThroughProbeComplete: true,
    });
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
      activeAllocationState.lookThroughRequestedMode === "prefer_look_through"
        ? "direct_only"
        : "prefer_look_through";
    setAllocationState({
      ...activeAllocationState,
      lookThroughBusy: true,
    });

    try {
      const response =
        nextMode === "prefer_look_through" && activeAllocationState.cachedLookThroughResponse
          ? {
              views: activeAllocationState.cachedLookThroughResponse.views,
              look_through: activeAllocationState.cachedLookThroughResponse.lookThrough,
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
      setAllocationState((current) =>
        current.sourceKey === allocationSourceKey
          ? {
              ...current,
              lookThroughBusy: false,
            }
          : current,
      );
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
    lookThroughRequestedMode: activeAllocationState.lookThroughRequestedMode,
    lookThroughLabel,
    lookThroughSupported: activeAllocationState.lookThroughSupported,
    lookThroughBusy: activeAllocationState.lookThroughBusy,
    lookThroughProbeComplete: activeAllocationState.lookThroughProbeComplete,
    holdingsDrilldownAvailable: exposureMode === "direct",
    changeDimension,
    selectBucket,
    toggleLookThrough,
  };
}

function buildInitialAllocationResolutionState(
  sourceKey: string,
  allocationViews: PortfolioAllocationView[],
): AllocationResolutionState {
  return {
    sourceKey,
    resolvedAllocationViews: allocationViews,
    lookThroughRequestedMode: "direct_only",
    lookThroughEffectiveMode: "direct_only",
    lookThroughSupported: false,
    lookThroughBusy: true,
    lookThroughProbeComplete: false,
    cachedLookThroughResponse: null,
  };
}
