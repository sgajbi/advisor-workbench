import type { WorkbenchPerformanceWorkspaceDetails } from "@/features/workbench/types";

export const DEFAULT_PERFORMANCE_DETAIL_DIMENSION = "asset_class";

type PerformanceDetailDimensionControls = {
  contributionDimension: string;
  attributionDimension: string;
};

export function getNormalizedInitialPerformanceDetailControls(
  details: WorkbenchPerformanceWorkspaceDetails,
  requestedControls: PerformanceDetailDimensionControls
): PerformanceDetailDimensionControls {
  const normalizedControls = {
    contributionDimension: details.contribution_dimension,
    attributionDimension: details.attribution_dimension,
  };
  const hasPartialFailures = (details.partial_failures?.length ?? 0) > 0;
  const hasPositionRanking = (details.contribution?.position_rows?.length ?? 0) > 0;
  const hasAttributionRows =
    details.attribution?.levels?.some((level) => level.rows.length > 0) ?? false;
  const degradedReturnPath =
    details.capabilities?.return_path.state === "unavailable" && hasPartialFailures;

  if (
    requestedControls.contributionDimension !== DEFAULT_PERFORMANCE_DETAIL_DIMENSION &&
    (degradedReturnPath ||
      (details.capabilities?.contribution_ranking.state !== "supported" && !hasPositionRanking))
  ) {
    normalizedControls.contributionDimension = DEFAULT_PERFORMANCE_DETAIL_DIMENSION;
  }

  if (
    requestedControls.attributionDimension !== DEFAULT_PERFORMANCE_DETAIL_DIMENSION &&
    (degradedReturnPath ||
      (details.capabilities?.attribution_detail.state === "unavailable" && !hasAttributionRows))
  ) {
    normalizedControls.attributionDimension = DEFAULT_PERFORMANCE_DETAIL_DIMENSION;
  }

  return normalizedControls;
}

