import { describe, expect, it } from "vitest";

import { buildPerformanceWorkspaceContextItems } from "../../src/apps/performance/components/performance-workspace-stage-surface";
import { buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

describe("buildPerformanceWorkspaceContextItems", () => {
  it("presents the source review context with business-specific labels", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;

    expect(
      buildPerformanceWorkspaceContextItems({
        workspace,
        period: "YTD",
        detailBasis: "NET",
      }),
    ).toEqual([
      { label: "Portfolio", value: "PF_1001" },
      { label: "Benchmark", value: "Global Balanced 60/40" },
      { label: "Review window", value: "YTD" },
      { label: "Fee basis", value: "Net of fees" },
      { label: "As-of date", value: "24 Feb 2026" },
    ]);
  });
});
