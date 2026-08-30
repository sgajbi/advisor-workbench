import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPortfolioCatalog, getPortfolioWorkspaceShell } from "@/apps/portfolio/api";
import { ReportOrderingPage } from "@/features/report-ordering/report-ordering-page";

vi.mock("@/apps/portfolio/api", () => ({
  getPortfolioCatalog: vi.fn(),
  getPortfolioWorkspaceShell: vi.fn(),
}));

vi.mock("@/features/report-ordering/components/report-ordering-workspace", () => ({
  ReportOrderingWorkspace: ({
    portfolio,
    initialBatchId,
    reviewContext,
  }: {
    portfolio: {
      portfolioId: string;
      asOfDate: string;
      sourceBaseCurrency: string;
      reportingCurrency: string;
      earliestReportDate: string;
      latestReportDate: string;
      reportingCurrencies: string[];
    };
    initialBatchId?: string;
    reviewContext: {
      portfolioName: string;
      businessDate?: string | null;
      currency?: { kind: "base" | "reporting"; value: string } | null;
      notice?: { label: string; message: string };
    };
  }) => (
    <div>
      <h1>Report Centre Workspace</h1>
      <span>{portfolio.portfolioId}</span>
      <span>{reviewContext.portfolioName}</span>
      <span>{reviewContext.businessDate}</span>
      <span data-testid="review-currency-kind">{reviewContext.currency?.kind}</span>
      <span data-testid="review-currency-value">{reviewContext.currency?.value}</span>
      <span data-testid="source-base-currency">{portfolio.sourceBaseCurrency}</span>
      <span data-testid="reporting-currency">{portfolio.reportingCurrency}</span>
      <span data-testid="earliest-report-date">{portfolio.earliestReportDate}</span>
      <span data-testid="latest-report-date">{portfolio.latestReportDate}</span>
      <span data-testid="reporting-currencies">{portfolio.reportingCurrencies.join(",")}</span>
      <span data-testid="initial-batch-id">{initialBatchId ?? "New report"}</span>
      {reviewContext.notice ? (
        <aside aria-label={reviewContext.notice.label}>{reviewContext.notice.message}</aside>
      ) : null}
    </div>
  ),
}));

const catalogMock = vi.mocked(getPortfolioCatalog);
const shellMock = vi.mocked(getPortfolioWorkspaceShell);

describe("reports page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogMock.mockResolvedValue([
      {
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        display_name: "Global Balanced Mandate",
        base_currency: "SGD",
        client_id: "CLIENT_001",
        booking_center_code: "SG",
      },
    ]);
    shellMock.mockResolvedValue({
      as_of_date: "2026-04-22",
      portfolio: {
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        display_name: "Global Balanced Mandate",
        client_id: "CLIENT_001",
        base_currency: "SGD",
        booking_center_code: "SG",
      },
      profile: {
        status: "ACTIVE",
        portfolio_type: "DISCRETIONARY",
        risk_exposure: null,
        investment_time_horizon: null,
        objective: null,
        is_leverage_allowed: null,
      },
    } as Awaited<ReturnType<typeof getPortfolioWorkspaceShell>>);
  });

  it("resolves selected portfolio context before rendering the ordering workspace", async () => {
    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({ portfolioId: "PB_SG_GLOBAL_BAL_001" }),
      }),
    );

    expect(shellMock).toHaveBeenCalledWith("PB_SG_GLOBAL_BAL_001");
    expect(screen.getByRole("heading", { name: "Report Centre Workspace" })).toBeInTheDocument();
    expect(screen.getByText("Global Balanced Mandate")).toBeInTheDocument();
    expect(screen.getByText("22 Apr 2026")).toBeInTheDocument();
    expect(screen.getByTestId("source-base-currency")).toHaveTextContent("SGD");
    expect(screen.getByTestId("reporting-currency")).toHaveTextContent("SGD");
  });

  it("keeps source base currency distinct from a governed reporting restatement", async () => {
    shellMock.mockResolvedValueOnce({
      as_of_date: "2026-04-22",
      portfolio: {
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        display_name: "Global Balanced Mandate",
        client_id: "CLIENT_001",
        base_currency: "SGD",
        booking_center_code: "SG",
      },
      profile: {
        status: "ACTIVE",
        portfolio_type: "DISCRETIONARY",
        risk_exposure: null,
        investment_time_horizon: null,
        objective: null,
        is_leverage_allowed: null,
      },
      control_capabilities: {
        historical_snapshots: {
          state: "supported",
          reason: "available",
          requested_as_of_date: "2026-04-22",
          effective_as_of_date: "2026-04-22",
          module_capabilities: [],
        },
        reporting_currency_restatement: {
          state: "supported",
          reason: "available",
          requested_reporting_currency: "USD",
          effective_reporting_currency: "USD",
          supported_currencies: ["SGD", "USD"],
          module_capabilities: [],
        },
      },
    } as unknown as Awaited<ReturnType<typeof getPortfolioWorkspaceShell>>);
    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          reportingCurrency: "USD",
        }),
      }),
    );

    expect(screen.getByTestId("source-base-currency")).toHaveTextContent("SGD");
    expect(screen.getByTestId("reporting-currency")).toHaveTextContent("USD");
    expect(screen.getByTestId("review-currency-kind")).toHaveTextContent("reporting");
    expect(screen.getByTestId("review-currency-value")).toHaveTextContent("USD");
  });

  it("offers only the reporting currencies published by the restatement capability", async () => {
    shellMock.mockResolvedValueOnce({
      as_of_date: "2026-04-22",
      portfolio: {
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        display_name: "Global Balanced Mandate",
        client_id: "CLIENT_001",
        base_currency: "SGD",
        booking_center_code: "SG",
      },
      profile: {
        status: "ACTIVE",
        portfolio_type: "DISCRETIONARY",
        risk_exposure: null,
        investment_time_horizon: null,
        objective: null,
        is_leverage_allowed: null,
      },
      income_summary: { reporting_currency: "EUR" },
      cash_balances: [{ currency: "HKD" }],
      control_capabilities: {
        historical_snapshots: {
          state: "supported",
          reason: "available",
          requested_as_of_date: "2026-04-22",
          effective_as_of_date: "2026-04-22",
          module_capabilities: [],
        },
        reporting_currency_restatement: {
          state: "supported",
          reason: "available",
          requested_reporting_currency: "USD",
          effective_reporting_currency: "USD",
          supported_currencies: ["SGD", "USD"],
          module_capabilities: [],
        },
      },
    } as unknown as Awaited<ReturnType<typeof getPortfolioWorkspaceShell>>);

    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          reportingCurrency: "USD",
        }),
      }),
    );

    expect(screen.getByTestId("reporting-currencies")).toHaveTextContent("SGD,USD");
    expect(screen.getByTestId("reporting-currencies")).not.toHaveTextContent("EUR");
    expect(screen.getByTestId("reporting-currencies")).not.toHaveTextContent("HKD");
  });

  it("fails closed when carried review context is outside the published restatement set", async () => {
    shellMock.mockResolvedValueOnce({
      as_of_date: "2026-04-22",
      portfolio: {
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        display_name: "Global Balanced Mandate",
        client_id: "CLIENT_001",
        base_currency: "SGD",
        booking_center_code: "SG",
      },
      profile: {
        status: "ACTIVE",
        portfolio_type: "DISCRETIONARY",
        risk_exposure: null,
        investment_time_horizon: null,
        objective: null,
        is_leverage_allowed: null,
      },
      cash_balances: [{ currency: "HKD" }],
      control_capabilities: {
        historical_snapshots: {
          state: "supported",
          reason: "available",
          requested_as_of_date: "2026-04-22",
          effective_as_of_date: "2026-04-22",
          module_capabilities: [],
        },
        reporting_currency_restatement: {
          state: "supported",
          reason: "available",
          requested_reporting_currency: "HKD",
          effective_reporting_currency: "HKD",
          supported_currencies: ["SGD", "USD"],
          module_capabilities: [],
        },
      },
    } as unknown as Awaited<ReturnType<typeof getPortfolioWorkspaceShell>>);

    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          reportingCurrency: "HKD",
        }),
      }),
    );

    expect(screen.getByText(/selected reporting currency is not available/i)).toBeInTheDocument();
    expect(screen.queryByText("Report Centre Workspace")).not.toBeInTheDocument();
  });

  it("discloses that a carried review period does not filter report ordering", async () => {
    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          period: "YTD",
        }),
      }),
    );

    expect(screen.getByLabelText("Report source context")).toHaveTextContent(
      /review period YTD.*does not filter this report ordering workflow/i,
    );
  });

  it("fails closed when portfolio workspace context cannot be loaded", async () => {
    shellMock.mockResolvedValue(null);

    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({ portfolioId: "PB_SG_GLOBAL_BAL_001" }),
      }),
    );

    expect(screen.getByText("Portfolio reporting context is unavailable")).toBeInTheDocument();
    expect(screen.getByTestId("review-context-strip")).toHaveTextContent(
      "Portfolio not confirmed",
    );
    expect(screen.getByText(/No report choices or submission controls/)).toBeInTheDocument();
    expect(screen.getByText(/confirmed portfolio context/)).toBeInTheDocument();
    expect(screen.queryByText(/source-backed portfolio context/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Report Centre Workspace")).not.toBeInTheDocument();
  });

  it("passes the governed batch identity into source rehydration", async () => {
    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          batchId: "rbch_1",
        }),
      }),
    );

    expect(screen.getByTestId("initial-batch-id")).toHaveTextContent("rbch_1");
  });

  it.each([
    {},
    { portfolioId: ["PB_SG_GLOBAL_BAL_001", "PB_OTHER_001"] },
  ])("makes no source calls without one governed report context: %o", async (searchParams) => {
    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve(searchParams),
      }),
    );

    expect(screen.getByText("Portfolio reporting context is unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Report Centre Workspace")).not.toBeInTheDocument();
    expect(catalogMock).not.toHaveBeenCalled();
    expect(shellMock).not.toHaveBeenCalled();
  });

  it("does not request report choices for unsupported review controls", async () => {
    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          period: "5Y",
        }),
      }),
    );

    expect(screen.getByText(/not supported for report ordering/i)).toBeInTheDocument();
    const reviewContext = screen.getByTestId("review-context-strip");
    expect(within(reviewContext).getByText("Global Balanced Mandate")).toBeInTheDocument();
    expect(within(reviewContext).getByText("CLIENT_001")).toBeInTheDocument();
    expect(within(reviewContext).queryByText("Portfolio not confirmed")).not.toBeInTheDocument();
    expect(screen.queryByText("Report Centre Workspace")).not.toBeInTheDocument();
  });
});
