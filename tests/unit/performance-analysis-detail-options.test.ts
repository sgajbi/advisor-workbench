import { describe, expect, it } from "vitest";

import { getContributionDetailOptions } from "../../src/apps/performance/components/performance-analysis-detail-options";

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
        label: "Segment Summary (4)",
        disabled: false,
        title: "4 grouped segment contribution rows available",
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
        label: "Segment Summary",
        disabled: true,
        title: "Grouped segment contribution is unavailable for this selection",
      }),
    ]);
  });
});
