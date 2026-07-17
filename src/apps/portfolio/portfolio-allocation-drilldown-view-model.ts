import { formatAllocationDimensionLabel } from "./portfolio-allocation-view-model";
import type {
  PortfolioAllocationSelection,
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
  selection,
  exposureMode,
}: {
  positions: PortfolioPositionView[];
  selection: PortfolioAllocationSelection | null;
  exposureMode: AllocationExposureMode;
}): AllocationHoldingsBreakdown {
  if (exposureMode === "expanded") {
    return {
      positions,
      filterLabel: null,
      title: "Booked holdings",
      description:
        "Booked holdings are shown for reference. Expanded exposure contributors require source-backed look-through detail.",
      state: "expanded",
    };
  }

  if (!selection) {
    return {
      positions,
      filterLabel: null,
      title: "Booked holdings",
      description:
        "Select a direct exposure above to review the booked holdings that contribute to it.",
      state: "all",
    };
  }

  const positionValue = ALLOCATION_POSITION_VALUE[selection.dimension];
  const dimensionLabel = formatAllocationDimensionLabel(selection.dimension);
  if (!positionValue) {
    return {
      positions,
      filterLabel: null,
      title: "Booked holdings",
      description: `${dimensionLabel} does not have a supported holdings classification for contributor review.`,
      state: "unsupported",
    };
  }

  const normalizedBucket = normalizeClassification(selection.bucket);
  const filteredPositions = positions.filter(
    (position) =>
      normalizeClassification(positionValue(position)) === normalizedBucket,
  );

  return {
    positions: filteredPositions,
    filterLabel: `${dimensionLabel}: ${selection.bucket}`,
    title: "Contributing holdings",
    description: `${filteredPositions.length} of ${positions.length} booked positions contribute to this direct exposure.`,
    state: "filtered",
  };
}

function normalizeClassification(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}
