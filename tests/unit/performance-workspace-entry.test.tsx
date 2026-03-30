import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceWorkspaceEntry from "../../src/apps/performance/components/performance-workspace-entry";
import {
  buildPerformanceWorkspaceDetails,
  buildPerformanceWorkspaceSummary,
} from "../fixtures/performance-workspace-fixtures";

vi.mock("../../src/apps/performance/components/performance-workspace-client", () => ({
  default: ({
    initialSummary,
    initialDetails,
  }: {
    initialSummary: { period: string } | null;
    initialDetails: { contribution?: { position_rows?: unknown[] } | null } | null;
  }) => (
    <div aria-label="performance-workspace-client">
      <span>period:{initialSummary?.period ?? "none"}</span>
      <span>
        details:{initialDetails?.contribution?.position_rows?.length ?? 0}
      </span>
    </div>
  ),
}));

describe("PerformanceWorkspaceEntry", () => {
  it("renders the initial workspace client immediately", () => {
    const summary = buildPerformanceWorkspaceSummary("PF_1001");
    const details = buildPerformanceWorkspaceDetails("PF_1001");

    render(
      <PerformanceWorkspaceEntry
        initialSummary={summary}
        initialDetails={details}
        initialPortfolioId="PF_1001"
        initialPeriod="YTD"
        initialDetailBasis="NET"
        initialContributionDimension="asset_class"
        initialAttributionDimension="asset_class"
        initialChartFrequency="monthly"
        initialBenchmark="BMK_GLOBAL_BALANCED_60_40"
      />
    );

    expect(screen.getByLabelText("performance-workspace-client")).toBeInTheDocument();
    expect(screen.getByText("period:YTD")).toBeInTheDocument();
    expect(screen.getByText("details:1")).toBeInTheDocument();
  });
});
