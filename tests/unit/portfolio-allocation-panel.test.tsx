import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioAllocationPanel from "../../src/apps/portfolio/components/portfolio-allocation-panel";
import type { PortfolioAllocationView } from "../../src/apps/portfolio/types";

const allocationViews: PortfolioAllocationView[] = [
  {
    dimension: "asset_class",
    buckets: [
      { bucket: "Equities", position_count: 7, market_value_base: 725000, weight_pct: 58 },
      { bucket: "Fixed Income", position_count: 4, market_value_base: 320000, weight_pct: 25.6 },
    ],
  },
  {
    dimension: "currency",
    buckets: [{ bucket: "USD", position_count: 9, market_value_base: 925000, weight_pct: 74 }],
  },
  {
    dimension: "sector",
    buckets: [{ bucket: "Technology", position_count: 4, market_value_base: 525000, weight_pct: 42 }],
  },
];

describe("PortfolioAllocationPanel", () => {
  it("renders supported dimensions, disables unsupported ones, and emits selections", () => {
    const onSelectionChange = vi.fn();

    render(
      <PortfolioAllocationPanel
        allocationViews={allocationViews}
        baseCurrency="USD"
        selectedAllocation={null}
        onSelectionChange={onSelectionChange}
      />
    );

    expect(screen.getByRole("tab", { name: "Asset Class" })).toBeEnabled();
    expect(screen.getByRole("tab", { name: "Currency" })).toBeEnabled();
    expect(screen.getByRole("tab", { name: "Sector" })).toBeEnabled();
    expect(screen.getByRole("tab", { name: "Region" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Look-through pending source support" })).toBeDisabled();

    fireEvent.click(screen.getByRole("tab", { name: "Currency" }));
    expect(screen.getByText("USD")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Donut" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "USD: 925,000 USD, 74.00%, 9 positions. Filter holdings.",
      })
    );
    expect(onSelectionChange).toHaveBeenCalledWith({
      dimension: "currency",
      bucket: "USD",
    });
  });

  it("supports keyboard activation on donut chart segments", () => {
    const onSelectionChange = vi.fn();

    render(
      <PortfolioAllocationPanel
        allocationViews={allocationViews}
        baseCurrency="USD"
        selectedAllocation={null}
        onSelectionChange={onSelectionChange}
      />
    );

    fireEvent.keyDown(
      screen.getByLabelText("Equities: 58.00%. Select to filter holdings."),
      { key: "Enter" }
    );

    expect(onSelectionChange).toHaveBeenCalledWith({
      dimension: "asset_class",
      bucket: "Equities",
    });
  });

  it("renders a structured empty state while keeping the module controls", () => {
    render(
      <PortfolioAllocationPanel
        allocationViews={[]}
        baseCurrency="USD"
        selectedAllocation={null}
        onSelectionChange={() => {}}
      />
    );

    expect(screen.getByRole("tab", { name: "Asset Class" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Region" })).toBeDisabled();
    expect(screen.getAllByText("No allocation data yet")).toHaveLength(2);
  });
});
