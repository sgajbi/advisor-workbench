import { describe, expect, it } from "vitest";

import {
  getAttributionDetailOptions,
  getContributionDetailOptions,
} from "../../src/apps/performance/components/performance-analysis-detail-options";

describe("performance analysis detail options", () => {
  it("adds live row counts to contribution drilldown labels", () => {
    expect(
      getContributionDetailOptions({
        positionCount: 10,
        segmentCount: 4,
        hasSegmentBreakdown: true,
      })
    ).toEqual([
      expect.objectContaining({
        key: "positions",
        label: "Positions (10)",
        title: "10 ranked positions available",
      }),
      expect.objectContaining({
        key: "segments",
        label: "Segment Contribution (4)",
        disabled: false,
        title: "4 grouped segment rows available",
      }),
    ]);
  });

  it("keeps contribution labels honest when counts are unavailable", () => {
    expect(
      getContributionDetailOptions({
        positionCount: 0,
        segmentCount: 0,
        hasSegmentBreakdown: false,
      })
    ).toEqual([
      expect.objectContaining({
        key: "positions",
        label: "Positions",
        title: "Position-level ranking is unavailable for this selection",
      }),
      expect.objectContaining({
        key: "segments",
        label: "Segment Contribution",
        disabled: true,
        title: "Grouped segment contribution is unavailable for this selection",
      }),
    ]);
  });

  it("labels attribution effect breakdown as summary-only when the backend has no segment rows", () => {
    expect(
      getAttributionDetailOptions({
        hasSummaryOnlyBreakdown: true,
      })
    ).toEqual([
      expect.objectContaining({
        key: "relative",
        label: "Relative Segment Context",
      }),
      expect.objectContaining({
        key: "breakdown",
        label: "Effect Breakdown",
        title: "Only summary-level benchmark-relative effects are available",
      }),
    ]);
  });
});
