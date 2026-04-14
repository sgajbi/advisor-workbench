import { describe, expect, it } from "vitest";

import { getNormalizedInitialPerformanceDetailControls } from "../../src/apps/performance/performance-detail-control-resolution";
import { buildPerformanceWorkspaceDetails } from "../fixtures/performance-workspace-fixtures";

describe("performance-detail-control-resolution", () => {
  it("falls back to asset class for degraded stale initial detail dimensions", () => {
    const degradedDetails = buildPerformanceWorkspaceDetails("PF_1001", {
      aggregateContributionOnly: true,
      unavailableAttribution: true,
    });
    degradedDetails.contribution_dimension = "country";
    degradedDetails.attribution_dimension = "country";
    const capabilities = degradedDetails.capabilities!;
    degradedDetails.capabilities = {
      ...capabilities,
      return_path: {
        ...capabilities.return_path,
        state: "unavailable",
        reason: "Published return observations are not available for the selected horizon.",
      },
    };
    degradedDetails.partial_failures = [
      {
        source_service: "lotus-performance",
        error_code: "HTTP_422",
        detail: "Benchmark component missing classification label for country.",
      },
    ];

    expect(
      getNormalizedInitialPerformanceDetailControls(degradedDetails, {
        contributionDimension: "country",
        attributionDimension: "country",
      })
    ).toEqual({
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
    });
  });

  it("preserves supported initial detail dimensions", () => {
    const supportedDetails = buildPerformanceWorkspaceDetails();

    expect(
      getNormalizedInitialPerformanceDetailControls(supportedDetails, {
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
      })
    ).toEqual({
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
    });
  });
});
