import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const routerPushMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/portfolio",
  useRouter: () => ({ push: routerPushMock }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const componentPromise = loader().then((mod: unknown) =>
      typeof mod === "function"
        ? (mod as React.ComponentType<Record<string, unknown>>)
        : ((mod as { default?: React.ComponentType<Record<string, unknown>> }).default ?? null),
    );

    return function MockDynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] =
        React.useState<React.ComponentType<Record<string, unknown>> | null>(null);
      React.useEffect(() => {
        let active = true;
        componentPromise.then((resolved) => {
          if (active) {
            setComponent(() => resolved);
          }
        });
        return () => {
          active = false;
        };
      }, []);
      return Component ? React.createElement(Component, props) : null;
    };
  },
}));

type MockGridRow = Record<string, unknown> & {
  securityId?: string;
  transactionId?: string;
};

type MockGridColumn = {
  field?: string;
  headerName?: string;
  hide?: boolean;
  valueFormatter?: (params: { value: unknown; data: MockGridRow }) => unknown;
};

vi.mock("ag-grid-react", () => ({
  AgGridReact: ({
    rowData = [],
    columnDefs = [],
    onRowClicked,
  }: {
    rowData?: MockGridRow[];
    columnDefs?: MockGridColumn[];
    onRowClicked?: (event: { data: MockGridRow }) => void;
  }) => {
    const visibleColumns = columnDefs.filter((column) => !column.hide);
    return (
      <div data-testid="mock-grid">
        <div>
          {visibleColumns.map((column) => (
            <span key={column.field}>{column.headerName}</span>
          ))}
        </div>
        {rowData.map((row) => (
          <button
            key={row.securityId ?? row.transactionId}
            type="button"
            onClick={() => onRowClicked?.({ data: row })}
          >
            {visibleColumns
              .map((column) => {
                const value = column.field ? row[column.field] : undefined;
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
import { expectReviewContextOwns } from "../review-context-census";

describe("PortfolioFoundationPage", () => {
  afterEach(() => {
    resetPortfolioApiRequestCache();
    window.localStorage.clear();
    vi.unstubAllGlobals();
    routerPushMock.mockReset();
  });

  it("does not call a source when governed review context is ambiguous", async () => {
    const fetchSpy = stubPortfolioApis();

    render(
      await PortfolioFoundationPage({
        searchParams: Promise.resolve({
          portfolioId: ["PORT_UI_1001", "PB_OTHER_001"],
          asOfDate: "2026-02-24",
        }),
      }),
    );

    expect(screen.getByText("Review context needs attention")).toBeInTheDocument();
    expect(screen.getByText(/No portfolio information was requested/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reset review context" })).toHaveAttribute(
      "href",
      "/portfolio",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Portfolio Review" })).toBeInTheDocument();
    expect(screen.getByTestId("review-context-strip")).toHaveAttribute(
      "data-source-state",
      "unavailable",
    );
  });

  it("hydrates a supported review period from the governed URL context", async () => {
    const baseFetch = stubPortfolioApis();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = input.toString();
        if (url.includes("/book")) {
          return jsonResponse({
            as_of_date: "2026-02-24",
            summary: {
              assets_under_management_base: 1250000,
              invested_market_value_base: 1145000,
              cash_market_value_base: 105000,
              cash_weight_pct: 8.4,
              position_count: 12,
              cash_balance_count: 2,
            },
            allocation_views: [],
            top_positions: [],
            positions: [],
          });
        }
        if (url.includes("/performance-snapshot")) {
          const period = url.includes("period=MTD")
            ? "MTD"
            : url.includes("period=QTD")
              ? "QTD"
              : "YTD";
          return jsonResponse({
            period,
            as_of_date: "2026-02-24",
            report_end_date: "2026-02-24",
            portfolio_return_pct: 2.5,
            benchmark_return_pct: 2.1,
            excess_return_pct: 0.4,
            warnings: [],
            partial_failures: [],
            sparkline: [],
          });
        }
        return baseFetch(input);
      }),
    );

    render(
      await PortfolioFoundationPage({
        searchParams: Promise.resolve({
          portfolioId: "PORT_UI_1001",
          asOfDate: "2026-02-24",
          period: "YTD",
          reportingCurrency: "USD",
        }),
      }),
    );

    expect(screen.queryByRole("radio", { name: "YTD" })).not.toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: "YTD" })).toBeChecked();
    expect(await screen.findByText(/Period YTD\./i)).toBeInTheDocument();
  });

  it("does not request analytical detail for unsupported portfolio context", async () => {
    const fetchSpy = stubPortfolioApis();

    render(
      await PortfolioFoundationPage({
        searchParams: Promise.resolve({
          portfolioId: "PORT_UI_1001",
          asOfDate: "2026-02-24",
          period: "5Y",
          reportingCurrency: "USD",
        }),
      }),
    );

    expect(screen.getByText("Review context needs attention")).toBeInTheDocument();
    expect(screen.getByText(/not supported by this portfolio's source capabilities/i)).toBeInTheDocument();
    expect(
      fetchSpy.mock.calls.some(([input]) => String(input).includes("/summary-details")),
    ).toBe(false);
  });

  it("renders the summary workspace for fast portfolio review", async () => {
    const fetchSpy = stubPortfolioApis();

    render(
      await PortfolioFoundationPage({
        searchParams: Promise.resolve({ portfolioId: "PORT_UI_1001" }),
      }),
    );

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
    expect(within(pageHeader as HTMLElement).getByRole("heading", { name: /^Portfolio Review$/i }))
      .toHaveClass("workbench-page-header-title");
    expect(
      within(pageHeader as HTMLElement).getByText(
        "Review portfolio value, returns, liquidity, exceptions, and the next business action."
      )
    ).toHaveClass("workbench-page-header-subtitle");
    expect(within(pageHeader as HTMLElement).queryByText("Catalog live")).not.toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: /^Portfolio Review$/i })).toBeInTheDocument();
    expect(document.querySelector(".workstation-shell-main .portfolio-hero")).toBeTruthy();
    const strip = screen.getByTestId("review-context-strip");
    const hero = document.querySelector(".portfolio-hero");
    expect(hero).toBeTruthy();
    expect(hero?.classList.contains("portfolio-book-hero")).toBe(true);
    expect(hero?.querySelector(".portfolio-hero-header")).toBeNull();
    expect(within(strip).getByText("Global Balanced")).toBeInTheDocument();
    expect(within(strip).getByText("USD")).toBeInTheDocument();
    expect(within(strip).getByText("CIF_1001")).not.toBeVisible();
    expect(within(strip).getByText("Singapore")).toBeInTheDocument();
    expectReviewContextOwns({
      exclusiveFacts: ["PORT_UI_1001", "CIF_1001", "Singapore"],
      contextualFacts: [{ label: "Business date", value: "24 Feb 2026" }],
    });
    expect(hero?.querySelector(".portfolio-hero-toolbar")).toBeNull();
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
    expect(keyMetrics.querySelectorAll(".portfolio-summary-band-item")).toHaveLength(6);
    for (const label of ["Portfolio value", "Invested assets", "Cash", "MTD return", "QTD return", "YTD return"]) {
      expect(within(keyMetrics).getByText(label)).toHaveAttribute("data-slot", "label");
    }
    expect(within(keyMetrics).queryByText("Cash Accounts")).not.toBeInTheDocument();
    expect(within(keyMetrics).queryByText("Holdings")).not.toBeInTheDocument();
    expect(within(keyMetrics).queryByText("30D Net Flow")).not.toBeInTheDocument();
    expect(within(keyMetrics).queryByText("Book Readiness")).not.toBeInTheDocument();
    expect(
      within(keyMetrics).getByRole("button", { name: /Portfolio value/i })
    ).toBeInTheDocument();
    expect(within(keyMetrics).getByRole("button", { name: /Invested Assets/i })).toBeInTheDocument();
    expect(within(keyMetrics).getByRole("button", { name: /^Cash:/i })).toBeInTheDocument();
    expect(within(keyMetrics).queryByRole("button", { name: /MTD Return/i })).not.toBeInTheDocument();
    expect(within(keyMetrics).queryByRole("button", { name: /QTD Return/i })).not.toBeInTheDocument();
    expect(within(keyMetrics).queryByRole("button", { name: /YTD Return/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("14 report rows published").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Generated 24 Feb 2026/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Income$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Activity$/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("As of")).toHaveValue("2026-02-24");
    expect(screen.getByLabelText("Reporting currency")).toHaveValue("USD");
    expect(screen.getByLabelText("As of")).toBeDisabled();
    expect(screen.getByLabelText("Reporting currency")).toBeDisabled();
    expect(screen.getByText(/Historical review is not available for this book yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Some workflow views keep book currency until full restatement is available/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Portfolio view navigation" })).not.toBeInTheDocument();
    expect(screen.getByText(/Period 30D\./i)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Portfolio period presets" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Filters" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export portfolio data" })).toBeInTheDocument();

    expect(screen.queryByRole("heading", { name: /Book Context/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Reporting Readiness/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Portfolio Health Snapshot/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Portfolio Insights/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Source Limitations/i })).toBeInTheDocument();
    const summaryCluster = document.querySelector(".portfolio-summary-cluster");
    expect(summaryCluster).toBeTruthy();
    expect(summaryCluster?.querySelector("#portfolio-summary")).toBeTruthy();
    expect(summaryCluster?.querySelector("#portfolio-attention")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Asset Allocation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Ranked positions$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Performance Snapshot/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Recent Transactions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Cashflow Forecast/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Liquidity and Projected Cash/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Advisor Guidance/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Portfolio Health")).not.toBeInTheDocument();
    expect(screen.getByText("Portfolio readiness")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Recommended Actions/i })).not.toBeInTheDocument();

    expect(screen.queryByRole("heading", { name: /Mandate Overview/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Recent Flows/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Detailed Records/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Holdings$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Transactions$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Projected Cashflow/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio holdings grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio transactions grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Projected cashflow chart in USD")).not.toBeInTheDocument();

    expect(document.querySelector(".portfolio-paired-analytics-grid")).toBeFalsy();
    expect(document.querySelector(".portfolio-paired-analytics-grid.workbench-summary-region")).toBeFalsy();
    expect(document.querySelectorAll(".portfolio-summary-module").length).toBe(0);
    expect(screen.getByText("Review focus")).toBeInTheDocument();
    expect(screen.queryByText("Recommended next step")).not.toBeInTheDocument();
    expect(document.querySelector(".workbench-decision-brief")).toBeTruthy();
    expect(document.querySelector(".portfolio-summary-module-card.workbench-summary-module-card")).toBeFalsy();
    expect(screen.queryByLabelText("Income summary")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Activity summary")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".workbench-rail-card")).toHaveLength(1);
    expect(document.querySelector(".portfolio-evidence-card.workbench-rail-card")).toBeTruthy();
    expect(document.querySelector(".portfolio-context-card")).toBeFalsy();
    expect(document.querySelector(".portfolio-context-card.workbench-rail-card")).toBeFalsy();
    expect(document.querySelector(".portfolio-readiness-card.workbench-rail-card")).toBeFalsy();
    expect(document.querySelector(".portfolio-actions-card.workbench-rail-card")).toBeFalsy();
    expect(document.querySelectorAll(".portfolio-side-card")).toHaveLength(1);
    expect(screen.queryByText(/target: performance workflow for this portfolio/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evidence coverage" })).toBeInTheDocument();
    expect(screen.queryByText("PORTFOLIO_CASH_BALANCES_UNAVAILABLE")).not.toBeInTheDocument();
    expect(screen.getAllByText("cash balance service unavailable").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /^Performance$/i })[0]).toHaveAttribute(
      "href",
      expect.stringContaining("portfolioId=PORT_UI_1001")
    );
    expect(screen.queryByText(/target: performance workflow for this portfolio/i)).not.toBeInTheDocument();

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
      expect(
        await screen.findByText("Metric detail", undefined, { timeout: 5000 }),
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: linkName })).toHaveAttribute("href", href);
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: heading })).not.toBeInTheDocument();
      }, { timeout: 5000 });
    };

    await openKeyMetricDrawer(
      /Portfolio value/i,
      "Portfolio value",
      "Open operating workbench",
      "/workbench/PORT_UI_1001?portfolioId=PORT_UI_1001&asOfDate=2026-02-24&period=30D&reportingCurrency=USD"
    );
    await openKeyMetricDrawer(
      /Invested Assets/i,
      "Invested assets",
      "Open allocation",
      "/positions?portfolioId=PORT_UI_1001&asOfDate=2026-02-24&period=30D&reportingCurrency=USD"
    );
    await openKeyMetricDrawer(
      /^Cash:/i,
      "Available cash",
      "Open liquidity",
      "/cashflow?portfolioId=PORT_UI_1001&asOfDate=2026-02-24&period=30D&reportingCurrency=USD"
    );

    const requestedUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(requestedUrls.some((url) => url.includes("/liquidity"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/transactions?limit=200"))).toBe(false);
  }, 30000);

  it("does not substitute a canonical portfolio when none is requested", async () => {
    const fetchSpy = stubPortfolioApis();

    render(await PortfolioFoundationPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Review context needs attention")).toBeInTheDocument();
    expect(screen.getByText(/No default portfolio was substituted/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open My book" })).toHaveAttribute(
      "href",
      "/book",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not substitute another portfolio when the requested identity is absent", async () => {
    const fetchSpy = stubPortfolioApis();

    render(
      await PortfolioFoundationPage({
        searchParams: Promise.resolve({ portfolioId: "PB_NOT_ASSIGNED_001" }),
      }),
    );

    expect(screen.getByText("Review context needs attention")).toBeInTheDocument();
    expect(screen.getByText(/No alternative portfolio was substituted/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Choose another portfolio" }),
    ).toHaveAttribute("href", "/book");
    expect(
      fetchSpy.mock.calls.some(([input]) =>
        String(input).includes("PB_NOT_ASSIGNED_001/workspace"),
      ),
    ).toBe(false);
  });

  it("ignores legacy detailed mode and keeps one focused portfolio review surface", async () => {
    window.localStorage.setItem("lotus:portfolio:view-mode", "detailed");
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    const fetchSpy = stubPortfolioApis();

    render(
      await PortfolioFoundationPage({
        searchParams: Promise.resolve({ portfolioId: "PORT_UI_1001" }),
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^Portfolio Review$/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("heading", { name: /Book Context/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Reporting Readiness/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Identity")).not.toBeInTheDocument();
    expect(screen.queryByText("Book Setup")).not.toBeInTheDocument();
    const detailedCluster = document.querySelector(".portfolio-detailed-cluster");
    expect(detailedCluster).toBeFalsy();
    expect(screen.getAllByText("As of").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("heading", { name: /Mandate Overview/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Portfolio Health Snapshot/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^Income and activity$/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /All workspaces/i }));
    expect(
      screen
        .getAllByRole("link", { name: /^Positions\b/i })
        .some((link) => link.getAttribute("href")?.includes("/positions"))
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /Transactions/i })
        .some((link) => link.getAttribute("href")?.includes("/transactions"))
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /^Projected cash flow\b/i })
        .some((link) => link.getAttribute("href")?.includes("/cashflow"))
    ).toBe(true);
    expect(screen.queryByText("Performance not available yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Why performance is unavailable" })).not.toBeInTheDocument();
    expect(document.querySelector(".portfolio-paired-analytics-grid")).toBeFalsy();
    expect(document.querySelector(".portfolio-paired-analytics-grid-detailed")).toBeFalsy();
    expect(screen.queryByRole("heading", { name: /Advisor Guidance/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Dedicated record screen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/source posture/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Income is not classified yet")).not.toBeInTheDocument();
    expect(screen.queryByText("Activity totals are incomplete")).not.toBeInTheDocument();

    expect(screen.queryByRole("tab", { name: "Detailed" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Summary" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Support details"));
    fireEvent.click(screen.getByRole("button", { name: "Copy Portfolio ID" }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("PORT_UI_1001");
    });

    fireEvent.click(screen.getByRole("button", { name: "Copy Client ID" }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("CIF_1001");
    });

    expect(window.localStorage.getItem("lotus:portfolio:view-mode")).toBe("detailed");
    expect(
      screen.queryByRole("heading", { name: /^Income and activity$/ }),
    ).not.toBeInTheDocument();

    const requestedUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(requestedUrls.some((url) => url.includes("/liquidity"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/transactions?limit=200"))).toBe(false);
  }, 30000);

  it("does not render allocation detail modules on the portfolio decision review surface", async () => {
    window.localStorage.setItem("lotus:portfolio:view-mode", "detailed");
    window.localStorage.setItem("lotus:portfolio:section:allocation", "false");
    stubPortfolioApis();

    render(
      await PortfolioFoundationPage({
        searchParams: Promise.resolve({ portfolioId: "PORT_UI_1001" }),
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^Portfolio Review$/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("heading", { name: /Portfolio Allocation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Asset Class" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /All workspaces/i }));
    expect(
      screen
        .getAllByRole("link", { name: /^Positions\b/i })
        .some((link) => link.getAttribute("href")?.includes("/positions"))
    ).toBe(true);
  }, 30000);

  it("keeps record grids and cashflow detail on separate screens when support is missing", async () => {
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

    render(
      await PortfolioFoundationPage({
        searchParams: Promise.resolve({ portfolioId: "PORT_UI_1001" }),
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^Portfolio Review$/i })).toBeInTheDocument();
    });

    expect(document.getElementById("portfolio-drilldown")).toBeFalsy();
    expect(screen.queryByRole("heading", { name: /Liquidity and Projected Cash/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Cashflow Forecast/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio holdings grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio transactions grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Projected cashflow chart in USD")).not.toBeInTheDocument();
  }, 30000);

  it("keeps allocation and holdings detail off the decision review surface when support is incomplete", async () => {
    stubPortfolioApis({
      allocations: {
        views: [],
      },
      positions: {
        top_positions: [],
        positions: [],
      },
    });

    render(
      await PortfolioFoundationPage({
        searchParams: Promise.resolve({ portfolioId: "PORT_UI_1001" }),
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^Portfolio Review$/i })).toBeInTheDocument();
    });

    expect(screen.queryByText("Allocation is unavailable for this portfolio.")).not.toBeInTheDocument();
    expect(screen.queryByText("Top holdings are unavailable for this portfolio.")).not.toBeInTheDocument();
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

    render(
      await PortfolioFoundationPage({
        searchParams: Promise.resolve({ portfolioId: "PORT_UI_1001" }),
      }),
    );

    expect(screen.getAllByText("Blocking controls active").length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it("renders a coherent combined-gap portfolio state when summary and drilldown support are both incomplete", async () => {
    window.localStorage.setItem("lotus:portfolio:view-mode", "detailed");
    stubPortfolioApis(buildCombinedPartialPortfolioOverrides());

    render(
      await PortfolioFoundationPage({
        searchParams: Promise.resolve({ portfolioId: "PORT_UI_1001" }),
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^Portfolio Review$/i })).toBeInTheDocument();
    });

    expect(screen.queryByText("Allocation is partially available")).not.toBeInTheDocument();
    expect(screen.queryByText("Top holdings are not ranked yet")).not.toBeInTheDocument();
    expect(screen.queryByText("No projected cashflow outlook is available in the current contract.")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Allocation donut chart")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Top holdings chart")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio holdings grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio transactions grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Projected cashflow chart in USD")).not.toBeInTheDocument();
  }, 30000);
});

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}
