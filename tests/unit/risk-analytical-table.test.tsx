import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskAnalyticalTable from "../../src/apps/performance/components/risk/risk-analytical-table";

describe("RiskAnalyticalTable", () => {
  it("renders a shared analysis-density table contract for risk panels", () => {
    const { container } = render(
      <RiskAnalyticalTable
        ariaLabel="Risk drawdown episode table"
        columns={[
          { key: "episode", label: "Episode" },
          { key: "depth", label: "Depth", align: "right" },
        ]}
        rows={[{ key: "episode-1", cells: ["Episode 1", "-12.45%"] }]}
        emptyState={{
          title: "No drawdown episodes",
          body: "No retained drawdown episodes are available for the selected review window.",
        }}
      />
    );

    expect(screen.getByRole("table", { name: "Risk drawdown episode table" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Depth" })).toBeInTheDocument();
    expect(screen.getByText("-12.45%")).toBeInTheDocument();
    expect(container.querySelector(".performance-risk-analytical-table")).toBeTruthy();
  });

  it("supports a compact variant for secondary analytical panels", () => {
    const { container } = render(
      <RiskAnalyticalTable
        ariaLabel="Historical risk attribution table"
        density="compact"
        columns={[{ key: "group", label: "Group" }]}
        rows={[{ key: "credit", cells: ["Private Credit"] }]}
        emptyState={{
          title: "No attribution contributors",
          body: "Historical risk attribution did not return contributor rows for the selected controls.",
        }}
      />
    );

    expect(container.querySelector(".performance-risk-analytical-table-compact")).toBeTruthy();
  });

  it("preserves explicit empty-state messaging instead of fabricating fallback rows", () => {
    render(
      <RiskAnalyticalTable
        ariaLabel="Rolling risk summary table"
        columns={[{ key: "metric", label: "Measure" }]}
        rows={[]}
        emptyState={{
          title: "No rolling risk metrics",
          body: "Rolling risk windows are not available for this portfolio context.",
        }}
      />
    );

    expect(screen.getByText("No rolling risk metrics")).toBeInTheDocument();
    expect(
      screen.getByText("Rolling risk windows are not available for this portfolio context.")
    ).toBeInTheDocument();
  });
});
