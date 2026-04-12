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
import { resetPortfolioApiRequestCache } from "../../src/apps/portfolio/api";
import {
  buildCombinedPartialPortfolioOverrides,
  stubPortfolioApis,
} from "../fixtures/portfolio-workspace-server-fixtures";

describe("PortfolioFoundationPage", () => {
  afterEach(() => {
    resetPortfolioApiRequestCache();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders the summary workspace for fast portfolio review", async () => {
    const fetchSpy = stubPortfolioApis();

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    expect(
      document.querySelector("main.workstation-page.app-page-shell.app-page-shell-portfolio.portfolio-page")
    ).toBeTruthy();
    expect(document.querySelector(".page-container")).toBeFalsy();
    expect(
      document.querySelector(".workbench-page-container.portfolio-page-container")
    ).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-header.workbench-page-header")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-body")).toBeTruthy();
    expect(document.querySelector(".workbench-section-stack.portfolio-page-sections")).toBeTruthy();
    const pageHeader = document.querySelector(".portfolio-page-frame .workbench-page-header");
    expect(pageHeader).toBeTruthy();
    expect(within(pageHeader as HTMLElement).getByRole("heading", { name: /^Portfolio$/i }))
      .toHaveClass("workbench-page-header-title");
    expect(
      within(pageHeader as HTMLElement).getByText(
        "Front-office portfolio context, readiness, and decision support"
      )
    ).toHaveClass("workbench-page-header-subtitle");
    expect(
      within(pageHeader as HTMLElement).getByRole("group", { name: "Portfolio page status" })
    ).toHaveClass("portfolio-page-header-actions");
    expect(within(pageHeader as HTMLElement).getByText("Catalog live")).toHaveClass(
      "portfolio-page-header-status"
    );
    expect(within(pageHeader as HTMLElement).queryByText("2 portfolios")).not.toBeInTheDocument();
    expect(
      document.querySelector(
        ".main-with-side-rail-layout.workstation-shell.workstation-shell-both.portfolio-layout"
      )
    ).toBeTruthy();
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
    expect(hero?.classList.contains("portfolio-book-hero")).toBe(true);
    expect(hero?.querySelector(".portfolio-hero-header")).toBeTruthy();
    expect(hero?.querySelector(".portfolio-hero-label")).toBeTruthy();
    expect(hero?.querySelector(".portfolio-hero-toolbar")).toBeTruthy();
    expect(within(hero as HTMLElement).getByText("USD")).toBeInTheDocument();
    expect(within(hero as HTMLElement).getByText("CIF_1001")).toBeInTheDocument();
    expect(within(hero as HTMLElement).getByText("Singapore")).toBeInTheDocument();
    expect(within(hero as HTMLElement).getByText("Active")).toBeInTheDocument();
    expect(within(hero as HTMLElement).queryByText("2 portfolios")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Book identity and status for rapid front-office orientation.")
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("1,250,000 USD").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1,145,000 USD").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("105,000 USD").length).toBeGreaterThanOrEqual(1);
    const keyMetrics = within(hero as HTMLElement).getByRole("group", {
      name: "Portfolio key metrics",
    });
    expect(keyMetrics).toHaveClass("portfolio-summary-band");
    expect(keyMetrics.querySelectorAll(".portfolio-summary-band-item")).toHaveLength(4);
    for (const label of ["AUM", "Invested Assets", "Cash", "Cash Accounts"]) {
      expect(within(keyMetrics).getByText(label)).toHaveClass("kpi-stat-label");
    }
    expect(within(keyMetrics).getByText("2")).toHaveClass("kpi-stat-value");
    expect(within(keyMetrics).getByText("2 cash accounts")).toHaveClass("kpi-stat-support");
    expect(within(keyMetrics).queryByText("Holdings")).not.toBeInTheDocument();
    expect(within(keyMetrics).queryByText("30D Net Flow")).not.toBeInTheDocument();
    expect(within(keyMetrics).queryByText("Book Readiness")).not.toBeInTheDocument();
    expect(within(keyMetrics).getByRole("button", { name: /AUM/i })).toBeInTheDocument();
    expect(within(keyMetrics).getByRole("button", { name: /Invested Assets/i })).toBeInTheDocument();
    expect(within(keyMetrics).getByRole("button", { name: /^Cash:/i })).toBeInTheDocument();
    expect(within(keyMetrics).queryByRole("button", { name: /Cash Accounts/i })).not.toBeInTheDocument();
    const cashAccountsTile = within(keyMetrics).getByText("Cash Accounts").closest(".kpi-stat-tile");
    expect(cashAccountsTile).toBeTruthy();
    expect(cashAccountsTile?.tagName.toLowerCase()).toBe("div");
    expect(cashAccountsTile).not.toHaveClass("kpi-stat-tile-interactive");
    expect(screen.getByText("Generated 24 Feb 2026 • 14 report rows")).toBeInTheDocument();
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
    const viewNavigation = screen.getByRole("tablist", { name: "Portfolio view navigation" });
    expect(viewNavigation).toHaveClass("mode-tabs", "portfolio-primary-view-tabs");
    expect(within(viewNavigation).getByRole("tab", { name: "Summary" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(within(viewNavigation).getByRole("tab", { name: "Detailed" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(screen.getByText(/Period 30D\./i)).toBeInTheDocument();
    expect(document.querySelector(".workbench-segmented-control[aria-label='Portfolio period presets']"))
      .toBeTruthy();
    const regionTab = await screen.findByRole("tab", { name: "Region" }, { timeout: 5000 });
    expect(regionTab).toBeDisabled();
    expect(document.querySelector(".workbench-segmented-control[aria-label='Allocation dimensions']"))
      .toBeTruthy();
    expect(document.querySelector(".workbench-segmented-control[aria-label='Allocation chart types']"))
      .toBeTruthy();
    expect(
      await screen.findByRole(
        "button",
        { name: "Look-through pending source support" },
        { timeout: 5000 }
      )
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export portfolio data" })).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /Portfolio Context/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Readiness and Exceptions/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Portfolio Health Snapshot/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Portfolio Insights/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Critical Exceptions and Blockers/i })).toBeInTheDocument();
    const summaryCluster = document.querySelector(".portfolio-summary-cluster");
    expect(summaryCluster).toBeTruthy();
    expect(summaryCluster?.querySelector("#portfolio-summary")).toBeTruthy();
    expect(summaryCluster?.querySelector("#portfolio-attention")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Portfolio Allocation/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Top Holdings/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Performance Snapshot/i })).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    const performanceSnapshotCard = screen
      .getByRole("heading", { name: /Performance Snapshot/i })
      .closest(".portfolio-summary-module-card");
    expect(performanceSnapshotCard).toBeTruthy();
    const insightsHeading = screen.getByRole("heading", { name: /Portfolio Insights/i });
    const insightsSection = insightsHeading.closest(".portfolio-workspace-section");
    expect(insightsSection?.querySelector(".portfolio-insights-summary-band")).toBeTruthy();
    expect(
      insightsSection?.querySelector(".portfolio-insights-summary-band .portfolio-insight-strip")
    ).toBeTruthy();
    expect(insightsSection?.querySelector(".portfolio-insights-summary-grid")).toBeTruthy();
    expect(
      performanceSnapshotCard &&
        performanceSnapshotCard.closest(".portfolio-insights-summary-grid")
    ).toBeTruthy();
    expect(insightsSection?.classList.contains("portfolio-summary-cluster-section")).toBe(true);
    expect(
      within(performanceSnapshotCard as HTMLElement).getByRole("link", { name: "Open Performance" })
    ).toHaveAttribute(
      "href",
      "/performance?portfolioId=PORT_UI_1001&period=EXPLICIT&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&reportStartDate=2026-01-25&reportEndDate=2026-02-24"
    );
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
    expect(document.querySelector(".portfolio-paired-analytics-grid.workbench-summary-region")).toBeTruthy();
    expect(document.querySelectorAll("[data-analytics-module]")).toHaveLength(2);
    expect(document.querySelectorAll(".portfolio-summary-module-card").length).toBeGreaterThanOrEqual(5);
    expect(document.querySelectorAll(".workbench-summary-module-card").length).toBeGreaterThanOrEqual(5);
    expect(document.querySelectorAll(".workbench-summary-card.workbench-summary-card-compact").length).toBeGreaterThanOrEqual(5);
    expect(document.querySelector(".portfolio-summary-module-card.workbench-summary-module-card")).toBeTruthy();
    expect(document.querySelectorAll(".workbench-summary-metric-strip")).toHaveLength(2);
    expect(document.querySelectorAll(".workbench-summary-toolbar").length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll(".workbench-summary-visual-card").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector(".workbench-summary-visual-label")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-value")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-meta")).toBeTruthy();
    expect(document.querySelector(".portfolio-analytics-summary-stat .workbench-summary-metric-label")).toBeTruthy();
    expect(document.querySelector(".portfolio-analytics-summary-stat .workbench-summary-metric-value")).toBeTruthy();
    expect(screen.queryByLabelText("Income summary")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Activity summary")).not.toBeInTheDocument();
    expect(document.querySelector(".portfolio-allocation-panel-compact")).toBeTruthy();
    expect(document.querySelectorAll(".portfolio-allocation-card")).toHaveLength(1);
    expect(screen.getByRole("tabpanel", { name: "Asset Class allocation view" })).toBeInTheDocument();
    expect(document.querySelector(".portfolio-allocation-panel-compact .portfolio-allocation-ranked")).toBeFalsy();
    const allocationCard = screen
      .getByRole("heading", { name: /Portfolio Allocation/i })
      .closest(".portfolio-summary-module-card");
    const topHoldingsCard = screen
      .getByRole("heading", { name: /Top Holdings/i })
      .closest(".portfolio-summary-module-card");
    expect(allocationCard).toBeTruthy();
    expect(topHoldingsCard).toBeTruthy();
    expect(allocationCard?.parentElement).toBe(topHoldingsCard?.parentElement);
    expect(
      Boolean(
        allocationCard &&
          topHoldingsCard &&
          allocationCard.compareDocumentPosition(topHoldingsCard) &
            Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true);
    expect(document.querySelectorAll(".workbench-rail-card")).toHaveLength(3);
    expect(document.querySelector(".portfolio-context-card.workbench-rail-card")).toBeTruthy();
    expect(document.querySelector(".portfolio-readiness-card.workbench-rail-card")).toBeTruthy();
    expect(document.querySelector(".portfolio-actions-card.workbench-rail-card")).toBeTruthy();
    expect(document.querySelectorAll(".portfolio-side-card")).toHaveLength(3);
    expect(document.querySelector(".portfolio-context-card .portfolio-context-panel")).toBeTruthy();
    expect(document.querySelector(".portfolio-readiness-card .portfolio-readiness-exception-list")).toBeTruthy();
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
      "/performance?portfolioId=PORT_UI_1001"
    );
    expect(screen.getByText("Review performance")).toBeInTheDocument();
    expect(
      screen.getByText(/review portfolio return, benchmark context, and contribution/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/target: performance workflow for this portfolio/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Performance$/i })[1]).toHaveAttribute(
      "href",
      "/performance?portfolioId=PORT_UI_1001"
    );

    const openKeyMetricDrawer = async (
      buttonName: RegExp,
      heading: string,
      linkName: string,
      href: string
    ) => {
      const currentKeyMetrics = within(hero as HTMLElement).getByRole("group", {
        name: "Portfolio key metrics",
      });
      fireEvent.click(within(currentKeyMetrics).getByRole("button", { name: buttonName }));
      await waitFor(() => {
        expect(screen.getByText("Metric Detail")).toBeInTheDocument();
      });
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: linkName })).toHaveAttribute("href", href);
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: heading })).not.toBeInTheDocument();
      });
    };

    await openKeyMetricDrawer(/AUM/i, "AUM", "Open health snapshot", "#portfolio-health");
    await openKeyMetricDrawer(
      /Invested Assets/i,
      "Invested Assets",
      "Open allocation",
      "#portfolio-insights"
    );
    await openKeyMetricDrawer(/^Cash:/i, "Available Cash", "Open liquidity", "#portfolio-insights");

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
    const detailedCluster = document.querySelector(".portfolio-detailed-cluster");
    expect(detailedCluster).toBeTruthy();
    expect(detailedCluster?.querySelector("#portfolio-health")).toBeTruthy();
    expect(detailedCluster?.querySelector("#portfolio-changes")).toBeTruthy();
    expect(detailedCluster?.querySelector("#portfolio-drilldown")).toBeTruthy();
    expect(screen.getAllByText("As of").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("heading", { name: /Mandate Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Portfolio Health Snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Recent Flows/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Where can I drill down/i })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: /^Holdings$/i }, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.getByText("As of 24 Feb 2026 in USD")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Columns/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: /^Transactions$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Projected Cashflow/i })).toBeInTheDocument();
    expect(screen.getByText("Next 10 days in USD")).toBeInTheDocument();
    expect(screen.getByText("Performance not available yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Why performance is unavailable" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Export/i }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole("button", { name: /Expand|Collapse/i }).length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByText("Dividend").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Inflows").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Income summary")).toBeInTheDocument();
    expect(screen.getByLabelText("Activity summary")).toBeInTheDocument();
    expect(document.querySelector(".portfolio-paired-analytics-grid")).toBeTruthy();
    expect(document.querySelector(".portfolio-paired-analytics-grid-detailed")).toBeTruthy();
    expect(document.querySelectorAll(".portfolio-analytics-table").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelectorAll(".portfolio-data-grid").length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector(".portfolio-cashflow-table.analytics-table-frame")).toBeTruthy();
    expect(screen.getAllByText("25 Feb 2026").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/booked events in 30D/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Projected cashflow chart in USD")).toBeInTheDocument();
    expect(screen.getByLabelText("Portfolio transactions grid")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Currency" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sector" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("From")[0]).toHaveValue("");
    expect(screen.getAllByLabelText("To")[0]).toHaveValue("");

    expect(screen.getByRole("tab", { name: "Detailed" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(document.querySelector("#portfolio-drilldown .portfolio-holdings-grid .portfolio-module-state")).toBeFalsy();
    expect(document.querySelector("#portfolio-drilldown .portfolio-transactions-grid .portfolio-module-state")).toBeFalsy();

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
    expect(within(transactionsGrid).queryByText("Settle Date")).not.toBeInTheDocument();
    fireEvent.click(
      within(transactionsGrid).getByRole("button", {
        name: /20 Feb 2026 \| Buy \| AAPL/i,
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

    fireEvent.click(screen.getByRole("tab", { name: "Summary" }));

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

  it("renders unavailable drilldown panels intentionally when detailed support is missing", async () => {
    window.localStorage.setItem("lotus:portfolio:view-mode", "detailed");
    stubPortfolioApis({
      workspace: {
        summary: {
          assets_under_management_base: 105000,
          invested_market_value_base: 0,
          cash_market_value_base: 105000,
          cash_weight_pct: 100,
          position_count: 0,
          cash_balance_count: 1,
        },
        cashflow_outlook: null,
      },
      positions: {
        top_positions: [],
        positions: [],
      },
      transactions: {
        transactions: [],
      },
      liquidity: {
        cash_balances: [],
        cashflow_outlook: null,
      },
    });

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Where can I drill down/i })).toBeInTheDocument();
    });

    const drilldownSection = document.getElementById("portfolio-drilldown");
    expect(drilldownSection).toBeTruthy();
    expect(drilldownSection?.querySelectorAll(".portfolio-disclosure")).toHaveLength(3);
    const liquidityHeading = screen.getByRole("heading", { name: /Liquidity and Projected Cash/i });
    expect(liquidityHeading).toBeInTheDocument();
    expect(screen.getAllByText("Projected cashflow unavailable").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getAllByText("No projected cashflow outlook is available in the current contract.").length
    ).toBeGreaterThanOrEqual(2);
    const liquidityModule = liquidityHeading.closest(".workbench-summary-card");
    expect(liquidityModule).toBeTruthy();
    expect(within(liquidityModule as HTMLElement).queryByText("N/A")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio holdings grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio transactions grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Projected cashflow chart in USD")).not.toBeInTheDocument();
  }, 30000);

  it("renders partial summary modules intentionally when portfolio support is incomplete", async () => {
    stubPortfolioApis({
      allocations: {
        views: [],
      },
      positions: {
        top_positions: [],
        positions: [],
      },
    });

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Portfolio Allocation/i })).toBeInTheDocument();
    });

    expect(screen.getByText("Allocation is partially available")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Holdings exist, but allocation views are not available in the current contract."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Publish current prices and valuation outputs to complete the allocation tabs.")
    ).toBeInTheDocument();
    expect(screen.getByText("Top holdings are not ranked yet")).toBeInTheDocument();
    expect(
      screen.getByText("Complete valuation and concentration calculations to populate the ranked holdings view.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Allocation donut chart")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Top holdings chart")).not.toBeInTheDocument();
  }, 30000);

  it("surfaces blocking operational controls in the summary-first readiness signal", async () => {
    stubPortfolioApis({
      workspace: {
        operations: {
          publish_allowed: false,
          controls_blocking: true,
          latest_booked_transaction_date: "2026-02-20",
        },
      },
    });

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByText("Blocking controls active").length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it("renders a coherent combined-gap portfolio state when summary and drilldown support are both incomplete", async () => {
    window.localStorage.setItem("lotus:portfolio:view-mode", "detailed");
    stubPortfolioApis(buildCombinedPartialPortfolioOverrides());

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Portfolio Allocation/i })).toBeInTheDocument();
    });

    expect(screen.getByText("Allocation is partially available")).toBeInTheDocument();
    expect(screen.getByText("Top holdings are not ranked yet")).toBeInTheDocument();
    expect(screen.getAllByText("Projected cashflow unavailable").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getAllByText("No projected cashflow outlook is available in the current contract.").length
    ).toBeGreaterThanOrEqual(2);
    expect(screen.queryByLabelText("Allocation donut chart")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Top holdings chart")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio holdings grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio transactions grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Projected cashflow chart in USD")).not.toBeInTheDocument();
  }, 30000);
});
