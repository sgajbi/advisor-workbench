"use client";

import {
  WorkbenchSegmentedControl,
  WorkbenchSummaryToolbar,
} from "@/design-system";

import {
  ALLOCATION_CHART_TYPES,
  ALLOCATION_DIMENSIONS,
} from "../portfolio-allocation-view-model";
import type {
  PortfolioAllocationSelection,
  PortfolioAllocationView,
} from "../types";
import type { AllocationExposureMode } from "../portfolio-allocation-drilldown-view-model";
import {
  AllocationBarChart,
  AllocationDonutChart,
  AllocationEmptyState,
  AllocationRankedList,
  AllocationTableChart,
} from "./portfolio-allocation-visuals";
import { usePortfolioAllocationPanelState } from "./use-portfolio-allocation-panel-state";

export default function PortfolioAllocationPanel({
  portfolioId,
  allocationViews,
  baseCurrency,
  asOfDate,
  reportingCurrency,
  compact = false,
  selectedAllocation,
  onSelectionChange,
  onExposureModeChange,
}: {
  portfolioId: string;
  allocationViews: PortfolioAllocationView[];
  baseCurrency: string;
  asOfDate: string;
  reportingCurrency: string;
  compact?: boolean;
  selectedAllocation: PortfolioAllocationSelection | null;
  onSelectionChange: (selection: PortfolioAllocationSelection | null) => void;
  onExposureModeChange?: (mode: AllocationExposureMode) => void;
}) {
  const allocationState = usePortfolioAllocationPanelState({
    portfolioId,
    allocationViews,
    asOfDate,
    reportingCurrency,
    selectedAllocation,
    onSelectionChange,
    onExposureModeChange,
  });
  const {
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
    holdingsDrilldownAvailable,
    changeDimension,
    selectBucket,
    toggleLookThrough,
  } = allocationState;

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
          onChange={changeDimension}
          options={ALLOCATION_DIMENSIONS.map((dimension) => {
            const isAvailable = viewsByDimension.has(dimension.key);
            return {
              key: dimension.key,
              label: dimension.label,
              disabled: !isAvailable,
              title: isAvailable
                ? dimension.label
                : `${dimension.label} allocation coverage unavailable`,
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
              ? "Expanded exposure"
              : "Direct holdings"}
          </button>
        </div>
      </WorkbenchSummaryToolbar>

      <div
        className="portfolio-analytics-canvas portfolio-allocation-card"
        role="tabpanel"
        aria-label={`${activeDimensionLabel} allocation view`}
      >
        <div className="portfolio-analytical-utility-header">
          <span>Portfolio exposure</span>
          <strong>{`${activeDimensionLabel} • ${buckets.length} exposures • ${lookThroughLabel}`}</strong>
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
                  holdingsDrilldownAvailable={holdingsDrilldownAvailable}
                  onHover={setHoveredBucket}
                  onSelect={selectBucket}
                />
              ) : null}
              {chartType === "bar" ? (
                <AllocationBarChart
                  buckets={buckets}
                  hoveredBucket={hoveredBucket}
                  selectedBucket={selectedBucket}
                  holdingsDrilldownAvailable={holdingsDrilldownAvailable}
                  onHover={setHoveredBucket}
                  onSelect={selectBucket}
                />
              ) : null}
              {chartType === "table" ? (
                <AllocationTableChart
                  buckets={buckets}
                  hoveredBucket={hoveredBucket}
                  selectedBucket={selectedBucket}
                  holdingsDrilldownAvailable={holdingsDrilldownAvailable}
                  onHover={setHoveredBucket}
                  onSelect={selectBucket}
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
                holdingsDrilldownAvailable={holdingsDrilldownAvailable}
                onHover={setHoveredBucket}
                onSelect={selectBucket}
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
