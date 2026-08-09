import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PortfolioAllocationPanel from "../../src/apps/portfolio/components/portfolio-allocation-panel";
import type { PortfolioAllocationView } from "../../src/apps/portfolio/types";
import { resetPortfolioApiRequestCache } from "../../src/apps/portfolio/api";

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
  afterEach(() => {
    vi.unstubAllGlobals();
    resetPortfolioApiRequestCache();
  });

  it("hydrates strategic allocation views, enables live region support, and emits selections", async () => {
    const onSelectionChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (!url.includes("/allocations?")) {
          throw new Error(`Unexpected fetch: ${url}`);
        }

        if (url.includes("look_through_mode=prefer_look_through")) {
          return jsonResponse({
            reporting_currency: "USD",
            look_through: {
              requested_mode: "prefer_look_through",
              effective_mode: "prefer_look_through",
              applied: true,
            },
            views: [
              {
                dimension: "region",
                buckets: [
                  {
                    bucket: "Asia",
                    position_count: 3,
                    market_value_base: 300000,
                    weight_pct: 24,
                  },
                ],
              },
            ],
          });
        }

        return jsonResponse({
          reporting_currency: "USD",
          look_through: {
            requested_mode: "direct_only",
            effective_mode: "direct_only",
            applied: false,
          },
          views: [
            ...allocationViews,
            {
              dimension: "region",
              buckets: [
                {
                  bucket: "North America",
                  position_count: 6,
                  market_value_base: 625000,
                  weight_pct: 50,
                },
              ],
            },
          ],
        });
      })
    );

    render(
      <PortfolioAllocationPanel
        portfolioId="MANUAL_PB_USD_001"
        allocationViews={allocationViews}
        baseCurrency="USD"
        asOfDate="2026-03-28"
        reportingCurrency="USD"
        selectedAllocation={null}
        onSelectionChange={onSelectionChange}
      />
    );

    expect(screen.getByRole("radio", { name: "Asset Class" })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("radio", { name: "Currency" })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("radio", { name: "Sector" })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("radio", { name: "Region" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("radio", { name: "Region" })).toHaveAttribute(
      "title",
      "Region allocation coverage unavailable",
    );
    expect(screen.queryByTitle("Region pending source support")).not.toBeInTheDocument();
    expect(screen.getAllByRole("radiogroup")).toHaveLength(2);
    expect(document.querySelectorAll(".portfolio-allocation-card")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Asset Class allocation view" })).toBeInTheDocument();
    expect(screen.getByText("Portfolio exposure")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Checking look-through support" })).toBeDisabled();
    expect(screen.getByText("725,000 USD")).toHaveClass("portfolio-allocation-ranked-number");

    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Region" })).not.toHaveAttribute("aria-disabled", "true")
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Look-through off" })).toBeEnabled());

    fireEvent.click(screen.getByRole("radio", { name: "Currency" }));
    expect(screen.getByRole("region", { name: "Currency allocation view" })).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Region" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "North America: 625,000 USD, 50.00%, 6 positions. Review contributing holdings.",
      }),
    );
    expect(onSelectionChange).toHaveBeenCalledWith({
      dimension: "region",
      bucket: "North America",
    });

    fireEvent.click(screen.getByRole("button", { name: "Look-through off" }));
    await waitFor(() =>
      expect(
        screen.getByText("Region • 1 exposures • Expanded exposure")
      ).toBeInTheDocument()
    );
    expect(onSelectionChange).toHaveBeenCalledWith(null);
    expect(
      screen.getByRole("button", {
        name: "Asia: 300,000 USD, 24.00%, 3 positions. Expanded exposure contributor detail is unavailable.",
      }),
    ).toBeDisabled();
  });

  it("supports keyboard activation on donut chart segments", async () => {
    const onSelectionChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          reporting_currency: "USD",
          look_through: {
            requested_mode: "direct_only",
            effective_mode: "direct_only",
            applied: false,
          },
          views: allocationViews,
        })
      )
    );

    render(
      <PortfolioAllocationPanel
        portfolioId="MANUAL_PB_USD_001"
        allocationViews={allocationViews}
        baseCurrency="USD"
        asOfDate="2026-03-28"
        reportingCurrency="USD"
        selectedAllocation={null}
        onSelectionChange={onSelectionChange}
      />
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Look-through unavailable for current portfolio snapshot",
        })
      ).toBeDisabled()
    );

    fireEvent.keyDown(
      screen.getByLabelText("Equities: 58.00%. Review contributing holdings."),
      { key: "Enter" }
    );

    expect(onSelectionChange).toHaveBeenCalledWith({
      dimension: "asset_class",
      bucket: "Equities",
    });
  });

  it("renders a professional empty state while keeping the module controls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          reporting_currency: "USD",
          look_through: {
            requested_mode: "direct_only",
            effective_mode: "direct_only",
            applied: false,
          },
          views: [{ dimension: "asset_class", buckets: [] }],
        })
      )
    );

    render(
      <PortfolioAllocationPanel
        portfolioId="MANUAL_PB_USD_001"
        allocationViews={[{ dimension: "asset_class", buckets: [] }]}
        baseCurrency="USD"
        asOfDate="2026-03-28"
        reportingCurrency="USD"
        selectedAllocation={null}
        onSelectionChange={() => {}}
      />
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Look-through unavailable for current portfolio snapshot",
        })
      ).toBeDisabled()
    );

    expect(screen.getByRole("radio", { name: "Asset Class" })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("radio", { name: "Region" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText("Asset Class allocation is not available yet")).toHaveLength(1);
    expect(
      screen.getAllByText(
        "This dimension requires funded holdings with current valuations before a reliable composition view can be shown."
      )
    ).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Asset Class allocation view" })).toBeInTheDocument();
  });

  it("uses a visual-only compact summary layout when requested", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          reporting_currency: "USD",
          look_through: {
            requested_mode: "direct_only",
            effective_mode: "direct_only",
            applied: false,
          },
          views: allocationViews,
        })
      )
    );

    const { container } = render(
      <PortfolioAllocationPanel
        portfolioId="MANUAL_PB_USD_001"
        allocationViews={allocationViews}
        baseCurrency="USD"
        asOfDate="2026-03-28"
        reportingCurrency="USD"
        compact
        selectedAllocation={null}
        onSelectionChange={() => {}}
      />
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Look-through unavailable for current portfolio snapshot",
        })
      ).toBeDisabled()
    );

    expect(container.querySelector(".portfolio-allocation-panel-compact")).toBeTruthy();
    expect(container.querySelector(".portfolio-allocation-toolbar.workbench-summary-toolbar")).toBeTruthy();
    expect(screen.getAllByRole("radiogroup")).toHaveLength(2);
    expect(container.querySelector(".portfolio-analytics-canvas.portfolio-allocation-card")).toBeTruthy();
    expect(container.querySelector(".portfolio-allocation-ranked")).toBeFalsy();
    expect(screen.getByLabelText("Allocation donut chart")).toBeInTheDocument();
  });

  it("keeps look-through disabled when gateway falls back to direct holdings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (!url.includes("/allocations?")) {
          throw new Error(`Unexpected fetch: ${url}`);
        }

        return jsonResponse({
          reporting_currency: "USD",
          look_through: {
            requested_mode: url.includes("look_through_mode=prefer_look_through")
              ? "prefer_look_through"
              : "direct_only",
            effective_mode: "direct_only",
            applied: false,
          },
          views: allocationViews,
        });
      })
    );

    render(
      <PortfolioAllocationPanel
        portfolioId="MANUAL_PB_USD_001"
        allocationViews={allocationViews}
        baseCurrency="USD"
        asOfDate="2026-03-28"
        reportingCurrency="USD"
        selectedAllocation={null}
        onSelectionChange={() => {}}
      />
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Look-through unavailable for current portfolio snapshot",
        })
      ).toBeDisabled()
    );
  });
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
