import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const React = require("react");
    return function MockDynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] = React.useState(
        null as React.ComponentType<Record<string, unknown>> | null
      );
      React.useEffect(() => {
        loader().then((mod: unknown) => {
          const resolved =
            typeof mod === "function"
              ? (mod as React.ComponentType<Record<string, unknown>>)
              : (mod as { default?: React.ComponentType<Record<string, unknown>> }).default;
          setComponent(() => resolved ?? null);
        });
      }, []);
      return Component ? React.createElement(Component, props) : null;
    };
  },
}));

vi.mock("ag-grid-react", () => ({
  AgGridReact: ({ rowData = [], columnDefs = [], onRowClicked }: any) => {
    const visibleColumns = columnDefs.filter((column: any) => !column.hide);
    return (
      <div data-testid="mock-grid">
        <div>
          {visibleColumns.map((column: any) => (
            <span key={column.field}>{column.headerName}</span>
          ))}
        </div>
        {rowData.map((row: any) => (
          <button
            key={row.securityId ?? row.transactionId}
            type="button"
            onClick={() => onRowClicked?.({ data: row })}
          >
            {visibleColumns
              .map((column: any) => {
                const value = row[column.field];
                if (typeof column.valueFormatter === "function") {
                  return column.valueFormatter({ value, data: row });
                }
                return value ?? "";
              })
              .join(" | ")}
          </button>
        ))}
      </div>
    );
  },
}));

import PortfolioFoundationPage from "../../src/app/portfolios/page";

describe("PortfolioFoundationPage", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders the summary workspace for fast portfolio review", async () => {
    const fetchSpy = stubPortfolioApis();

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    expect(document.querySelector("main.workstation-page.portfolio-page")).toBeTruthy();
    expect(document.querySelector(".page-container")).toBeFalsy();
    expect(document.querySelector(".workbench-page-header")).toBeTruthy();
    expect(document.querySelector(".workstation-shell.workstation-shell-both.portfolio-layout")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-rail.portfolio-rail-shell")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-main.portfolio-main")).toBeTruthy();
    expect(
      document.querySelector(".workstation-shell.workstation-shell-side-density-comfortable.portfolio-layout")
    ).toBeTruthy();
    expect(
      document.querySelector(
        ".workstation-shell-side.workstation-shell-side-comfortable.portfolio-side.portfolio-side-wide"
      )
    ).toBeTruthy();
    expect(document.querySelector(".lotus-workstation-header")).toBeFalsy();
    expect(screen.getByRole("heading", { name: /^Portfolio$/i })).toBeInTheDocument();
    expect(document.querySelector(".workstation-shell-main .portfolio-hero")).toBeTruthy();
    const hero = screen.getByRole("heading", { name: /Global Balanced/i }).closest(".portfolio-hero");
    expect(hero).toBeTruthy();
    expect(within(hero as HTMLElement).getByText("USD")).toBeInTheDocument();
    expect(within(hero as HTMLElement).getByText("CIF_1001")).toBeInTheDocument();
    expect(within(hero as HTMLElement).getByText("Singapore")).toBeInTheDocument();
    expect(within(hero as HTMLElement).getByText("Active")).toBeInTheDocument();
    expect(
      screen.queryByText("Book identity and status for rapid front-office orientation.")
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("1,250,000 USD").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1,145,000 USD").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("105,000 USD").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("12 holdings")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Income Plus")).toBeInTheDocument();
      expect(screen.getAllByText("14,750 USD").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("2 booked events")).toBeInTheDocument();
      expect(screen.getByText("Large position dominates portfolio risk")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("As of")).toHaveValue("2026-02-24");
    expect(screen.getByLabelText("Reporting Currency")).toHaveValue("USD");
    expect(screen.getByLabelText("As of")).toBeDisabled();
    expect(screen.getByLabelText("Reporting Currency")).toBeDisabled();
    expect(screen.getByText(/Historical snapshots are not source-backed/i)).toBeInTheDocument();
    expect(screen.getByText(/Reporting currency restatement is pending source support/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Detailed" })).toBeInTheDocument();
    expect(screen.getByText(/Period 30D\./i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Region" })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Look-through pending source support" })
      ).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export portfolio data" })).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /Portfolio Context/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Readiness and Exceptions/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Portfolio Health Snapshot/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Portfolio Insights/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Critical Exceptions and Blockers/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Portfolio Allocation/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Top Holdings/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Performance Snapshot/i })).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Income$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Activity$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Next Actions/i })).toBeInTheDocument();

    expect(screen.queryByRole("heading", { name: /Mandate Overview/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Recent Flows/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Where can I drill down/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Holdings$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Transactions$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Projected Cashflow/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio holdings grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio transactions grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Projected cashflow chart in USD")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText("Top holdings chart")).toBeInTheDocument();
      expect(screen.getByLabelText("Income chart")).toBeInTheDocument();
      expect(screen.getByLabelText("Activity chart")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Top holdings chart")).toBeInTheDocument();
    expect(screen.getByLabelText("Income chart")).toBeInTheDocument();
    expect(screen.getByLabelText("Activity chart")).toBeInTheDocument();
    expect(document.querySelector(".portfolio-paired-analytics-grid")).toBeTruthy();
    expect(document.querySelectorAll(".portfolio-analytics-summary-row")).toHaveLength(2);
    expect(document.querySelectorAll("[data-analytics-module]")).toHaveLength(2);
    expect(document.querySelectorAll(".portfolio-summary-module-card").length).toBeGreaterThanOrEqual(5);
    expect(document.querySelectorAll(".workbench-summary-module-card").length).toBeGreaterThanOrEqual(5);
    expect(document.querySelectorAll(".workbench-summary-card.workbench-summary-card-compact").length).toBeGreaterThanOrEqual(5);
    expect(document.querySelectorAll(".workbench-summary-metric-strip")).toHaveLength(2);
    expect(document.querySelectorAll(".workbench-summary-toolbar").length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll(".workbench-summary-visual-card").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector(".portfolio-analytics-summary-stat .workbench-summary-metric-label")).toBeTruthy();
    expect(document.querySelector(".portfolio-analytics-summary-stat .workbench-summary-metric-value")).toBeTruthy();
    expect(screen.queryByLabelText("Income summary")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Activity summary")).not.toBeInTheDocument();
    expect(document.querySelector(".portfolio-allocation-panel-compact")).toBeTruthy();
    expect(document.querySelector(".portfolio-allocation-panel-compact .portfolio-allocation-ranked")).toBeFalsy();
    expect(document.querySelectorAll(".workbench-rail-card")).toHaveLength(3);
    expect(document.querySelector(".portfolio-context-card.workbench-rail-card")).toBeTruthy();
    expect(document.querySelector(".portfolio-readiness-card.workbench-rail-card")).toBeTruthy();
    expect(document.querySelector(".portfolio-actions-card.workbench-rail-card")).toBeTruthy();
    expect(document.querySelector(".portfolio-actions-card .portfolio-workflow-item")).toBeTruthy();
    expect(document.querySelector(".portfolio-actions-card .portfolio-evidence-copy")).toBeTruthy();
    expect(
      document.querySelector(".portfolio-actions-card .portfolio-workflow-actions .portfolio-workflow-cta")
    ).toBeTruthy();
    expect(screen.queryByText(/target: performance workflow for this portfolio/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Data Coverage/i })).toBeInTheDocument();
    expect(screen.getByText("PORTFOLIO_CASH_BALANCES_UNAVAILABLE")).toBeInTheDocument();
    expect(screen.getAllByText("cash balance service unavailable").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /^Performance$/i })[0]).toHaveAttribute(
      "href",
      "/ignored"
    );
    expect(screen.getByText("Review performance")).toBeInTheDocument();
    expect(
      screen.getByText(/review portfolio return, benchmark context, and contribution/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/target: performance workflow for this portfolio/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Performance$/i })[1]).toHaveAttribute(
      "href",
      "/ignored"
    );

    fireEvent.click(screen.getAllByRole("button", { name: /AUM/i })[0]);
    await waitFor(() => {
      expect(screen.getByText("Metric Detail")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "AUM" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open health snapshot" })).toHaveAttribute(
      "href",
      "#portfolio-health"
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: /PORTFOLIO CASH BALANCES UNAVAILABLE/i }));
    await waitFor(() => {
      expect(screen.getByText("Readiness Issue")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "PORTFOLIO CASH BALANCES UNAVAILABLE" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: /Dismiss Large position dominates portfolio risk/i }));
    expect(screen.queryByText("Large position dominates portfolio risk")).not.toBeInTheDocument();

    const requestedUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(requestedUrls.some((url) => url.includes("/liquidity"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/transactions?limit=200"))).toBe(false);
  }, 30000);

  it("restores detailed mode and exposes full drill-down content", async () => {
    window.localStorage.setItem("lotus:portfolio:view-mode", "detailed");
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    const fetchSpy = stubPortfolioApis();

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Recent Flows/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: /Portfolio Context/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Readiness and Exceptions/i })).toBeInTheDocument();
    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Book Setup")).toBeInTheDocument();
    expect(screen.getAllByText("As of").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("heading", { name: /Mandate Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Portfolio Health Snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Recent Flows/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Where can I drill down/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^Holdings$/i })).toBeInTheDocument();
      expect(screen.getByText("As of 24 Feb 2026 in USD")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Columns/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("heading", { name: /^Transactions$/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Projected Cashflow/i })).toBeInTheDocument();
      expect(screen.getByText("Next 10 days in USD")).toBeInTheDocument();
    });
    expect(screen.getByText("Performance not available yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Why performance is unavailable" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Export/i }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole("button", { name: /Expand/i }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Dividend").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Inflows").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Income summary")).toBeInTheDocument();
    expect(screen.getByLabelText("Activity summary")).toBeInTheDocument();
    expect(document.querySelector(".portfolio-paired-analytics-grid")).toBeTruthy();
    expect(screen.getAllByText("25 Feb 2026").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/booked events in 30D/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Projected cashflow chart in USD")).toBeInTheDocument();
    expect(screen.getByLabelText("Portfolio transactions grid")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Currency" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sector" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("From")[0]).toHaveValue("");
    expect(screen.getAllByLabelText("To")[0]).toHaveValue("");

    expect(screen.getByRole("button", { name: "Detailed" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(
      screen.getByRole("listitem", { name: /Apple Inc: 250,000 USD. Select to filter holdings./i })
    );

    expect(screen.getAllByText(/Filtered by holding: Apple Inc/i).length).toBeGreaterThanOrEqual(1);
    let holdingsTable = screen.getByLabelText("Portfolio holdings grid");
    expect(
      within(holdingsTable).getByText((content) => content.includes("Apple Inc"))
    ).toBeInTheDocument();
    expect(
      within(holdingsTable).queryByText((content) => content.includes("US Treasury 2030"))
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Sector" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Government: 320,000 USD, 25.60%, 5 positions. Filter holdings.",
      })
    );

    expect(screen.getAllByText(/Filtered by Sector: Government/i).length).toBeGreaterThanOrEqual(1);
    holdingsTable = screen.getByLabelText("Portfolio holdings grid");
    expect(
      within(holdingsTable).getByText((content) => content.includes("US Treasury 2030"))
    ).toBeInTheDocument();
    expect(
      within(holdingsTable).queryByText((content) => content.includes("Apple Inc"))
    ).not.toBeInTheDocument();

    expect(screen.getByLabelText("Portfolio transactions grid")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("listitem", {
        name: /Inflows.*Select to filter transactions\./i,
      })
    );
    expect(screen.getByText("Filtered by activity: Inflows")).toBeInTheDocument();

    fireEvent.click(
      within(holdingsTable).getByRole("button", {
        name: /US Treasury 2030 \| Fixed Income \| 80/i,
      })
    );
    await waitFor(() => {
      expect(screen.getByText("Holding Detail")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "US Treasury 2030" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Related Transactions" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    const transactionsGrid = screen.getByLabelText("Portfolio transactions grid");
    fireEvent.click(
      within(transactionsGrid).getByRole("button", {
        name: /20 Feb 2026 \| — \| BUY \| AAPL/i,
      })
    );
    await waitFor(() => {
      expect(screen.getByText("Transaction Detail")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Buy" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: /Copy Portfolio/i }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("PORT_UI_1001");
    });

    fireEvent.click(screen.getByRole("button", { name: /Copy Client/i }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("CIF_1001");
    });

    fireEvent.click(screen.getByRole("button", { name: "Summary" }));

    expect(window.localStorage.getItem("lotus:portfolio:view-mode")).toBe("summary");
    expect(screen.queryByRole("heading", { name: /Recent Flows/i })).not.toBeInTheDocument();

    const requestedUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(requestedUrls.some((url) => url.includes("/liquidity"))).toBe(true);
    expect(requestedUrls.some((url) => url.includes("/transactions?limit=200"))).toBe(true);
  }, 30000);

  it("respects stored section collapse preferences", async () => {
    window.localStorage.setItem("lotus:portfolio:view-mode", "detailed");
    window.localStorage.setItem("lotus:portfolio:section:allocation", "false");
    stubPortfolioApis();

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Where can I drill down/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: /Portfolio Allocation/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("tab", { name: "Asset Class" })).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("Holdings").length).toBeGreaterThan(0);
  }, 30000);
});

function stubPortfolioApis() {
  const fetchSpy = buildPortfolioFetchStub();
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

function buildPortfolioFetchStub() {
  return vi.fn(async (input: string | URL) => {
    const url = input.toString();

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/workspace")) {
      return jsonResponse({
        as_of_date: "2026-02-24",
        portfolio: {
          portfolio_id: "PORT_UI_1001",
          display_name: "Global Balanced",
          client_id: "CIF_1001",
          base_currency: "USD",
          booking_center_code: "SG",
        },
        profile: {
          status: "ACTIVE",
          portfolio_type: "ADVISORY",
          risk_exposure: "MODERATE",
          investment_time_horizon: "LONG_TERM",
          objective: "GROWTH",
          is_leverage_allowed: false,
          open_date: "2024-01-01",
        },
        summary: {
          assets_under_management_base: 1250000,
          invested_market_value_base: 1145000,
          cash_market_value_base: 105000,
          cash_weight_pct: 8.4,
          position_count: 12,
          cash_balance_count: 2,
        },
        reporting: {
          status: "READY",
          generated_at_utc: "2026-02-24T08:32:00Z",
          row_count: 14,
        },
        cashflow_outlook: {
          as_of_date: "2026-02-24",
          range_end_date: "2026-03-05",
          total_net_cashflow_base: -25000,
          projection_days: 10,
          include_projected: true,
          upcoming_points: [
            {
              projection_date: "2026-02-25",
              net_cashflow_base: -15000,
              projected_cumulative_cashflow_base: -15000,
            },
          ],
        },
        workflow_cues: [
          { key: "performance", label: "Performance", href: "/ignored" },
          { key: "risk", label: "Risk", href: "/ignored" },
          { key: "proposal", label: "Proposal", href: "/ignored" },
        ],
        warnings: ["PORTFOLIO_CASH_BALANCES_UNAVAILABLE"],
        partial_failures: [
          {
            source_service: "lotus-core",
            error_code: "PORTFOLIO_CASH_BALANCES_UNAVAILABLE",
            detail: "cash balance service unavailable",
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/liquidity")) {
      return jsonResponse({
        cash_balances: [
          {
            security_id: "CASH_USD",
            instrument_name: "USD Operating Cash",
            currency: "USD",
            quantity: 105000,
            market_value_base: 105000,
            weight_pct: 8.4,
          },
        ],
        cashflow_outlook: {
          as_of_date: "2026-02-24",
          range_end_date: "2026-03-05",
          total_net_cashflow_base: -25000,
          projection_days: 10,
          include_projected: true,
          upcoming_points: [
            {
              projection_date: "2026-02-25",
              net_cashflow_base: -15000,
              projected_cumulative_cashflow_base: -15000,
            },
          ],
        },
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/allocations")) {
      return jsonResponse({
        views: [
          {
            dimension: "asset_class",
            buckets: [
              {
                bucket: "Equities",
                position_count: 7,
                market_value_base: 725000,
                weight_pct: 58,
              },
              {
                bucket: "Fixed Income",
                position_count: 4,
                market_value_base: 320000,
                weight_pct: 25.6,
              },
            ],
          },
          {
            dimension: "currency",
            buckets: [
              {
                bucket: "USD",
                position_count: 9,
                market_value_base: 925000,
                weight_pct: 74,
              },
              {
                bucket: "EUR",
                position_count: 3,
                market_value_base: 220000,
                weight_pct: 17.6,
              },
            ],
          },
          {
            dimension: "sector",
            buckets: [
              {
                bucket: "Technology",
                position_count: 4,
                market_value_base: 525000,
                weight_pct: 42,
              },
              {
                bucket: "Government",
                position_count: 5,
                market_value_base: 320000,
                weight_pct: 25.6,
              },
            ],
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/positions")) {
      return jsonResponse({
        top_positions: [
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc",
            asset_class: "Equities",
            quantity: 120,
            market_value_base: 250000,
            weight_pct: 20,
          },
          {
            security_id: "FI_1",
            instrument_name: "US Treasury 2030",
            asset_class: "Fixed Income",
            quantity: 80,
            market_value_base: 180000,
            weight_pct: 14.4,
          },
        ],
        positions: [
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc",
            asset_class: "Equities",
            sector: "Technology",
            held_since_date: "2024-01-15",
            currency: "USD",
            quantity: 120,
            cost_basis_base: 200000,
            market_value_local: 250000,
            market_value_base: 250000,
            unrealized_gain_loss_base: 50000,
            weight_pct: 20,
          },
          {
            security_id: "FI_1",
            instrument_name: "US Treasury 2030",
            asset_class: "Fixed Income",
            sector: "Government",
            held_since_date: "2023-08-01",
            currency: "USD",
            quantity: 80,
            cost_basis_base: 175000,
            market_value_local: 180000,
            market_value_base: 180000,
            unrealized_gain_loss_base: 5000,
            weight_pct: 14.4,
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/transactions")) {
      return jsonResponse({
        transactions: [
          {
            transaction_id: "TX_1",
            transaction_date: "2026-02-20T08:30:00Z",
            transaction_type: "BUY",
            security_id: "EQ_1",
            instrument_id: "AAPL",
            quantity: 10,
            price: 180,
            gross_amount: 18000,
            net_cost_base: 18000,
            realized_gain_loss_base: 0,
            currency: "USD",
            settlement_status: "SETTLED",
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/income-summary")) {
      return jsonResponse({
        reporting_currency: "USD",
        window_start_date: "2026-01-26",
        window_end_date: "2026-02-24",
        totals_requested_window: {
          gross: { reporting_currency_amount: 3200, transaction_count: 2 },
          withholding_tax: { reporting_currency_amount: 200, transaction_count: 2 },
          other_deductions: { reporting_currency_amount: 0, transaction_count: 2 },
          net: { reporting_currency_amount: 3000, transaction_count: 2 },
        },
        totals_year_to_date: {
          gross: { reporting_currency_amount: 5400, transaction_count: 4 },
          withholding_tax: { reporting_currency_amount: 350, transaction_count: 4 },
          other_deductions: { reporting_currency_amount: 0, transaction_count: 4 },
          net: { reporting_currency_amount: 5050, transaction_count: 4 },
        },
        income_types: [
          {
            income_type: "DIVIDEND",
            requested_window: {
              gross: { reporting_currency_amount: 2500, transaction_count: 1 },
              withholding_tax: { reporting_currency_amount: 200, transaction_count: 1 },
              other_deductions: { reporting_currency_amount: 0, transaction_count: 1 },
              net: { reporting_currency_amount: 2300, transaction_count: 1 },
            },
            year_to_date: {
              gross: { reporting_currency_amount: 4200, transaction_count: 2 },
              withholding_tax: { reporting_currency_amount: 350, transaction_count: 2 },
              other_deductions: { reporting_currency_amount: 0, transaction_count: 2 },
              net: { reporting_currency_amount: 3850, transaction_count: 2 },
            },
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/activity-summary")) {
      return jsonResponse({
        reporting_currency: "USD",
        window_start_date: "2026-01-26",
        window_end_date: "2026-02-24",
        buckets: [
          {
            bucket: "INFLOWS",
            requested_window: {
              reporting_currency_amount: 15000,
              transaction_count: 1,
            },
            year_to_date: {
              reporting_currency_amount: 25000,
              transaction_count: 2,
            },
          },
          {
            bucket: "FEES",
            requested_window: {
              reporting_currency_amount: -250,
              transaction_count: 1,
            },
            year_to_date: {
              reporting_currency_amount: -500,
              transaction_count: 2,
            },
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/readiness")) {
      return jsonResponse({
        indicators: [
          { key: "holdings", label: "Holdings", status: "Ready", href: "#portfolio-insights" },
          { key: "pricing", label: "Pricing", status: "Ready", href: "#portfolio-attention" },
          { key: "transactions", label: "Transactions", status: "Ready", href: "#portfolio-insights" },
          { key: "reporting", label: "Reporting", status: "Ready", href: "#portfolio-health" },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/insights")) {
      return jsonResponse({
        insights: [
          {
            key: "equity-concentration-high",
            title: "Large position dominates portfolio risk",
            detail: "One holding has become large enough to dominate current portfolio concentration.",
            severity: "warning",
            href: "#portfolio-insights",
          },
        ],
        exception_summaries: [
          {
            key: "pricing",
            title: "Pricing coverage incomplete",
            detail: "Some holdings lack complete valuation coverage.",
            tone: "warn",
            href: "#portfolio-attention",
          },
          {
            key: "partial_failure_PORTFOLIO_CASH_BALANCES_UNAVAILABLE",
            title: "PORTFOLIO CASH BALANCES UNAVAILABLE",
            detail: "cash balance service unavailable",
            tone: "warn",
            href: "#portfolio-attention",
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios/PORT_UI_1001/workflow")) {
      return jsonResponse({
        actions: [
          {
            sequence: 1,
            title: "Review performance",
            impact: "Review portfolio return, benchmark context, and contribution once the book is valued.",
            target: "Target: Performance workflow for this portfolio",
            href: "/ignored",
            cta_label: "Performance",
            recommended: true,
          },
        ],
      });
    }

    if (url.includes("/api/v1/portfolio/portfolios")) {
      return jsonResponse({
        items: [
          {
            portfolio_id: "PORT_UI_1001",
            display_name: "Global Balanced",
            base_currency: "USD",
            client_id: "CIF_1001",
            booking_center_code: "SG",
          },
          {
            portfolio_id: "PORT_UI_1002",
            display_name: "Income Plus",
            base_currency: "USD",
            client_id: "CIF_1002",
            booking_center_code: "HK",
          },
        ],
      });
    }

    return { ok: false, json: async () => ({}) } as Response;
  });
}

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}
