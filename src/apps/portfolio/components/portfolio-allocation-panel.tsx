"use client";

import {
  ActionButton,
  WorkbenchChoiceGroup,
  WorkbenchRefreshStatus,
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
import {
  type AllocationCoverageStatus,
  usePortfolioAllocationPanelState,
} from "./use-portfolio-allocation-panel-state";
import styles from "./portfolio-allocation-panel.module.css";

export default function PortfolioAllocationPanel({
  portfolioId,
  allocationViews,
  baseCurrency,
  asOfDate,
  reportingCurrency,
  selectedAllocation,
  onSelectionChange,
  onExposureModeChange,
}: {
  portfolioId: string;
  allocationViews: PortfolioAllocationView[];
  baseCurrency: string;
  asOfDate: string;
  reportingCurrency: string;
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
    lookThroughCoverageStatus,
    lookThroughSupported,
    lookThroughBusy,
    holdingsDrilldownAvailable,
    changeDimension,
    selectBucket,
    toggleLookThrough,
    recheckLookThroughCoverage,
  } = allocationState;

  return (
    <div className={`portfolio-allocation-panel ${styles.root}`}>
      <WorkbenchSummaryToolbar className="portfolio-allocation-toolbar">
        <WorkbenchChoiceGroup
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
          <WorkbenchChoiceGroup
            value={chartType}
            onChange={setChartType}
            options={ALLOCATION_CHART_TYPES.map((option) => ({
              key: option.key,
              label: option.label,
            }))}
            ariaLabel="Allocation chart types"
            className={styles.chartSwitcher}
          />

          <button
            type="button"
            className="portfolio-allocation-toggle"
            disabled={!lookThroughSupported || lookThroughBusy}
            aria-disabled={!lookThroughSupported || lookThroughBusy}
            aria-pressed={lookThroughRequestedMode === "prefer_look_through"}
            aria-label={
              lookThroughSupported
                ? lookThroughRequestedMode === "prefer_look_through"
                  ? "Show direct positions"
                  : "Show expanded exposure"
                : lookThroughCoverageStatus === "failed"
                  ? "Expanded exposure coverage could not be confirmed"
                  : lookThroughCoverageStatus === "unsupported"
                    ? "Expanded exposure unavailable for current portfolio snapshot"
                    : "Checking expanded exposure coverage"
            }
            title={
              lookThroughSupported
                ? `Current allocation mode: ${lookThroughLabel}`
                : lookThroughCoverageStatus === "failed"
                  ? "Expanded exposure coverage could not be confirmed"
                  : lookThroughCoverageStatus === "unsupported"
                    ? "Expanded exposure is not available for the current portfolio snapshot"
                    : "Checking expanded exposure coverage"
            }
            onClick={toggleLookThrough}
          >
            {lookThroughRequestedMode === "prefer_look_through"
              ? "Expanded exposure"
              : "Direct positions"}
          </button>

          <ActionButton
            priority="quiet"
            aria-disabled={lookThroughBusy}
            aria-label="Recheck exposure coverage"
            onClick={() => {
              void recheckLookThroughCoverage();
            }}
          >
            {lookThroughBusy ? "Checking…" : "Recheck coverage"}
          </ActionButton>
        </div>
      </WorkbenchSummaryToolbar>

      <AllocationCoverageStatus status={lookThroughCoverageStatus} />

      <div
        className="portfolio-analytics-canvas portfolio-allocation-card"
        role="region"
        aria-label={`${activeDimensionLabel} allocation view`}
      >
        <div className="portfolio-analytical-utility-header">
          <span>Portfolio exposure</span>
          <strong>{`${activeDimensionLabel} • ${buckets.length} exposures • ${lookThroughLabel}`}</strong>
        </div>
        {buckets.length ? (
          <div className={`portfolio-allocation-body ${styles.body}`}>
            <div className={`portfolio-allocation-visual ${styles.visual}`}>
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
          </div>
        ) : (
          <AllocationEmptyState dimensionLabel={activeDimensionLabel} />
        )}
      </div>
    </div>
  );
}

function AllocationCoverageStatus({ status }: { status: AllocationCoverageStatus }) {
  if (status === "checking") {
    return (
      <WorkbenchRefreshStatus
        kind="pending"
        eyebrow="Exposure coverage"
        title="Checking expanded exposure"
        message="Direct allocation remains available while source coverage is confirmed."
        requestedContext="Expanded exposure"
        confirmedContext="Direct positions"
      />
    );
  }

  if (status === "failed") {
    return (
      <WorkbenchRefreshStatus
        kind="failed"
        eyebrow="Exposure coverage"
        title="Expanded exposure could not be confirmed"
        message="Direct allocation remains available. Recheck source coverage before using expanded exposure."
        requestedContext="Expanded exposure"
        confirmedContext="Direct positions"
      />
    );
  }

  return (
    <WorkbenchRefreshStatus
      kind="confirmed"
      eyebrow="Exposure coverage"
      title={status === "available" ? "Source coverage confirmed" : "Direct positions only"}
      confirmedContext={
        status === "available"
          ? "Expanded exposure is available for this portfolio snapshot"
          : "Expanded exposure is not available for this portfolio snapshot"
      }
    />
  );
}
