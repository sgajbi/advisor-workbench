import { formatAllocationDimensionLabel } from "./portfolio-allocation-view-model";
import { buildBookedHoldingsInventory } from "./portfolio-booked-holdings-view-model";
import type {
  PortfolioAllocationSelection,
  PortfolioCashBalance,
  PortfolioPositionView,
} from "./types";

export type AllocationExposureMode = "direct" | "expanded";

export type AllocationHoldingsBreakdown = {
  positions: PortfolioPositionView[];
  filterLabel: string | null;
  title: string;
  description: string;
  state: "all" | "filtered" | "unsupported" | "expanded";
};

const ALLOCATION_POSITION_VALUE: Record<
  string,
  (position: PortfolioPositionView) => string | null | undefined
> = {
  asset_class: (position) => position.asset_class,
  currency: (position) => position.currency,
  sector: (position) => position.sector,
  region: (position) => position.country_of_risk,
};

export function buildAllocationHoldingsBreakdown({
  positions,
  cashBalances = [],
  selection,
  exposureMode,
}: {
  positions: PortfolioPositionView[];
  cashBalances?: PortfolioCashBalance[];
  selection: PortfolioAllocationSelection | null;
  exposureMode: AllocationExposureMode;
}): AllocationHoldingsBreakdown {
  const bookedHoldings = buildBookedHoldingsInventory(positions, cashBalances);

  if (exposureMode === "expanded") {
    return {
      positions: bookedHoldings,
      filterLabel: null,
      title: "Positions",
      description:
        "Positions are shown for reference. Expanded exposure contributors require source-backed look-through detail.",
      state: "expanded",
    };
  }

  if (!selection) {
    return {
      positions: bookedHoldings,
      filterLabel: null,
      title: "Positions",
      description:
        "Select a direct exposure above to review the positions that contribute to it.",
      state: "all",
    };
  }

  const positionValue = ALLOCATION_POSITION_VALUE[selection.dimension];
  const dimensionLabel = formatAllocationDimensionLabel(selection.dimension);
  if (!positionValue) {
    return {
      positions: bookedHoldings,
      filterLabel: null,
      title: "Positions",
      description: `${dimensionLabel} does not have a supported position classification for contributor review.`,
      state: "unsupported",
    };
  }

  const normalizedBucket = normalizeClassification(selection.bucket);
  const filteredPositions = bookedHoldings.filter(
    (position) =>
      normalizeClassification(positionValue(position)) === normalizedBucket,
  );

  return {
    positions: filteredPositions,
    filterLabel: `${dimensionLabel}: ${selection.bucket}`,
    title: "Contributing positions",
    description: `${filteredPositions.length} of ${bookedHoldings.length} positions contribute to this direct exposure.`,
    state: "filtered",
  };
}

function normalizeClassification(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}
