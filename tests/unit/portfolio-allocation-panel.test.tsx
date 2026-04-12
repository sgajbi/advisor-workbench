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
    expect(document.querySelectorAll(".workbench-segmented-control")).toHaveLength(2);
    expect(document.querySelectorAll(".portfolio-allocation-card")).toHaveLength(1);
    expect(screen.getByRole("tabpanel", { name: "Asset Class allocation view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Look-through pending source support" })).toBeDisabled();
    expect(screen.getByText("725,000 USD")).toHaveClass("portfolio-allocation-ranked-number");

    fireEvent.click(screen.getByRole("tab", { name: "Currency" }));
    expect(screen.getByRole("tabpanel", { name: "Currency allocation view" })).toBeInTheDocument();
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

  it("renders a professional empty state while keeping the module controls", () => {
    render(
      <PortfolioAllocationPanel
        allocationViews={[{ dimension: "asset_class", buckets: [] }]}
        baseCurrency="USD"
        selectedAllocation={null}
        onSelectionChange={() => {}}
      />
    );

    expect(screen.getByRole("tab", { name: "Asset Class" })).toBeEnabled();
    expect(screen.getByRole("tab", { name: "Region" })).toBeDisabled();
    expect(screen.getAllByText("Asset Class allocation is not available yet")).toHaveLength(1);
    expect(
      screen.getAllByText(
        "This dimension requires funded holdings with current valuations before a reliable composition view can be shown."
      )
    ).toHaveLength(1);
    expect(screen.getByRole("tabpanel", { name: "Asset Class allocation view" })).toBeInTheDocument();
  });

  it("uses a visual-only compact summary layout when requested", () => {
    const { container } = render(
      <PortfolioAllocationPanel
        allocationViews={allocationViews}
        baseCurrency="USD"
        compact
        selectedAllocation={null}
        onSelectionChange={() => {}}
      />
    );

    expect(container.querySelector(".portfolio-allocation-panel-compact")).toBeTruthy();
    expect(container.querySelector(".portfolio-allocation-toolbar.workbench-summary-toolbar")).toBeTruthy();
    expect(container.querySelectorAll(".workbench-segmented-control")).toHaveLength(2);
    expect(
      container.querySelector(".portfolio-allocation-card.workbench-summary-visual-card")
    ).toBeTruthy();
    expect(container.querySelector(".portfolio-allocation-ranked")).toBeFalsy();
    expect(screen.getByLabelText("Allocation donut chart")).toBeInTheDocument();
  });
});
