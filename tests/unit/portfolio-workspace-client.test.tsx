import React, { StrictMode } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";
import PortfolioWorkspaceClient from "../../src/apps/portfolio/components/portfolio-workspace-client";
import { buildInitialPortfolioControls } from "../../src/apps/portfolio/view-model";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";

const getSummaryDetailsMock = vi.fn();
const getShellWorkspaceMock = vi.fn();
const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/portfolio",
  useRouter: () => ({ push: routerPushMock, replace: routerReplaceMock }),
  useSearchParams: () =>
    new URLSearchParams("portfolioId=MANUAL_PB_USD_001&period=30D"),
}));

vi.mock("../../src/apps/portfolio/api", () => ({
  getPortfolioWorkspaceShell: (...args: unknown[]) =>
    getShellWorkspaceMock(...args),
  getPortfolioWorkspaceSummaryDetails: (...args: unknown[]) =>
    getSummaryDetailsMock(...args),
  mergePortfolioWorkspace: (
    current: PortfolioWorkspace,
    details: Partial<PortfolioWorkspace>,
  ) => ({ ...current, ...details }),
}));

vi.mock(
  "../../src/apps/portfolio/components/portfolio-workspace-toolbar",
  () => ({
    default: ({
      controls,
      onControlsChange,
    }: {
      controls: {
        viewMode: "summary" | "detailed";
        timeWindow: "30D" | "YTD" | "1Y";
      };
      onControlsChange: (patch: {
        viewMode?: "summary" | "detailed";
        timeWindow?: "30D" | "YTD" | "1Y";
      }) => void;
    }) => (
      <div>
        <div data-testid="view-mode">{controls.viewMode}</div>
        <div data-testid="time-window">{controls.timeWindow}</div>
        <button
          type="button"
          onClick={() => onControlsChange({ viewMode: "detailed" })}
        >
          Switch Detailed
        </button>
        <button
          type="button"
          onClick={() => onControlsChange({ timeWindow: "YTD" })}
        >
          Select YTD
        </button>
        <button
          type="button"
          onClick={() => onControlsChange({ timeWindow: "1Y" })}
        >
          Select 1Y
        </button>
      </div>
    ),
  }),
);

vi.mock("../../src/apps/portfolio/components/portfolio-workspace", () => ({
  default: ({
    toolbar,
    workspace,
    workspaceStatus,
  }: {
    toolbar?: React.ReactNode;
    workspace: PortfolioWorkspace | null;
    workspaceStatus?: "loading" | "ready" | "unavailable";
  }) => (
    <div>
      {toolbar}
      <div data-testid="shell-status">{workspaceStatus}</div>
      <div data-testid="portfolio-id">
        {workspace?.portfolio?.portfolio_id ?? "none"}
      </div>
      <div data-testid="market-value">
        {workspace?.summary?.market_value_base ?? "none"}
      </div>
      <div data-testid="position-count">
        {workspace?.positions.length ?? "none"}
      </div>
      <div data-testid="insight-key">
        {workspace?.insights?.[0]?.key ?? "none"}
      </div>
      <div data-testid="exception-key">
        {workspace?.exception_summaries?.[0]?.key ?? "none"}
      </div>
      <div data-testid="workflow-action">
        {workspace?.workflow_actions?.[0]?.title ?? "none"}
      </div>
    </div>
  ),
}));

function buildWorkspace(portfolioId = "MANUAL_PB_USD_001"): PortfolioWorkspace {
  return {
    as_of_date: "2026-03-28",
    portfolio: {
      portfolio_id: portfolioId,
      display_name: portfolioId,
      client_id: `CLIENT_${portfolioId}`,
      base_currency: "USD",
      booking_center_code: "Singapore",
    },
    profile: {
      status: "ACTIVE",
      portfolio_type: "Advisory",
      risk_exposure: "Moderate Growth",
      investment_time_horizon: "Long Term",
      objective: "Long-term capital appreciation.",
      is_leverage_allowed: false,
    },
    summary: {
      market_value_base: 1001550.05,
      invested_market_value_base: 917032.95,
      total_cash_base: 84517.1,
      cash_weight_pct: 8.43863,
      position_count: 9,
      cash_balance_count: 2,
    },
    allocations: [],
    allocation_views: [],
    cash_balances: [],
    top_positions: [],
    positions: [],
    recent_transactions: [],
    income_summary: null,
    activity_summary: null,
    cashflow_outlook: null,
    performance: null,
    rebalance: null,
    readiness: {
      has_positions: true,
      reporting: { status: "READY", generated_at_utc: null, row_count: 4 },
    },
    readiness_indicators: undefined,
    exception_summaries: undefined,
    insights: undefined,
    operations: null,
    workflow_cues: [],
    workflow_actions: undefined,
    warnings: [],
    partial_failures: [],
  };
}

describe("PortfolioWorkspaceClient", () => {
  afterEach(() => {
    getShellWorkspaceMock.mockReset();
    getSummaryDetailsMock.mockReset();
    routerPushMock.mockReset();
    resetAnalyticsUiMetricEvents();
    window.localStorage.clear();
  });

  it("commits a review period and URL only after source detail is confirmed", async () => {
    getSummaryDetailsMock.mockResolvedValue({ positions: [] });
    render(
      <PortfolioWorkspaceClient
        portfolios={[
          {
            portfolio_id: "MANUAL_PB_USD_001",
            display_name: "Manual portfolio",
            base_currency: "USD",
            client_id: "MANUAL_CIF_001",
            booking_center_code: "Singapore",
          },
        ]}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={buildWorkspace()}
      />,
    );
    await waitFor(() => expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1));
    routerPushMock.mockReset();

    let confirmDetails:
      ((value: Partial<PortfolioWorkspace>) => void) | undefined;
    getSummaryDetailsMock.mockReturnValueOnce(
      new Promise((resolve) => {
        confirmDetails = resolve;
      }),
    );
    await act(async () => {
      screen.getByRole("button", { name: "Select YTD" }).click();
    });

    expect(screen.getByTestId("time-window")).toHaveTextContent("30D");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Confirming review context",
    );
    expect(routerPushMock).not.toHaveBeenCalled();

    await act(async () => {
      confirmDetails?.({ as_of_date: "2026-03-28", positions: [] });
    });
    await waitFor(() => {
      expect(screen.getByTestId("time-window")).toHaveTextContent("YTD");
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Review context confirmed",
    );
    expect(routerPushMock).toHaveBeenCalledWith(
      "/portfolio?portfolioId=MANUAL_PB_USD_001&asOfDate=2026-03-28&period=YTD&reportingCurrency=USD",
      { scroll: false },
    );
  });

  it("keeps the confirmed context and commits only after a successful retry", async () => {
    getSummaryDetailsMock
      .mockResolvedValueOnce({ positions: [] })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        as_of_date: "2026-03-28",
        positions: [],
      });
    render(
      <PortfolioWorkspaceClient
        portfolios={[
          {
            portfolio_id: "MANUAL_PB_USD_001",
            display_name: "Manual portfolio",
            base_currency: "USD",
            client_id: "MANUAL_CIF_001",
            booking_center_code: "Singapore",
          },
        ]}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={buildWorkspace()}
      />,
    );
    await waitFor(() => expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      screen.getByRole("button", { name: "Select YTD" }).click();
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Review context was not changed",
    );
    expect(screen.getByTestId("time-window")).toHaveTextContent("30D");
    const retry = screen.getByRole("button", {
      name: "Retry portfolio review context",
    });
    expect(retry).toBeEnabled();
    expect(routerPushMock).not.toHaveBeenCalled();

    await act(async () => {
      retry.click();
    });
    await waitFor(() => {
      expect(screen.getByTestId("time-window")).toHaveTextContent("YTD");
    });
    expect(routerPushMock).toHaveBeenCalledTimes(1);
  });

  it("commits only the latest review-context request", async () => {
    getSummaryDetailsMock.mockResolvedValueOnce({ positions: [] });
    render(
      <PortfolioWorkspaceClient
        portfolios={[
          {
            portfolio_id: "MANUAL_PB_USD_001",
            display_name: "Manual portfolio",
            base_currency: "USD",
            client_id: "MANUAL_CIF_001",
            booking_center_code: "Singapore",
          },
        ]}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={buildWorkspace()}
      />,
    );
    await waitFor(() => expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1));

    let confirmYtd: ((value: Partial<PortfolioWorkspace>) => void) | undefined;
    let confirmOneYear:
      ((value: Partial<PortfolioWorkspace>) => void) | undefined;
    getSummaryDetailsMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          confirmYtd = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          confirmOneYear = resolve;
        }),
      );

    await act(async () => {
      screen.getByRole("button", { name: "Select YTD" }).click();
      screen.getByRole("button", { name: "Select 1Y" }).click();
    });
    await waitFor(() => expect(getSummaryDetailsMock).toHaveBeenCalledTimes(3));
    await act(async () => {
      confirmOneYear?.({ as_of_date: "2026-03-28", positions: [] });
    });
    await waitFor(() =>
      expect(screen.getByTestId("time-window")).toHaveTextContent("1Y"),
    );

    await act(async () => {
      confirmYtd?.({ as_of_date: "2026-03-28", positions: [] });
    });
    expect(screen.getByTestId("time-window")).toHaveTextContent("1Y");
    expect(routerPushMock).toHaveBeenCalledTimes(1);
    expect(routerPushMock).toHaveBeenCalledWith(
      expect.stringContaining("period=1Y"),
      { scroll: false },
    );
  });

  it("does not commit an in-flight control request after portfolio identity changes", async () => {
    getSummaryDetailsMock.mockResolvedValueOnce({ positions: [] });
    const firstWorkspace = buildWorkspace("MANUAL_PB_USD_001");
    const { rerender } = render(
      <PortfolioWorkspaceClient
        portfolios={[
          {
            portfolio_id: "MANUAL_PB_USD_001",
            display_name: "First portfolio",
            base_currency: "USD",
            client_id: "MANUAL_CIF_001",
            booking_center_code: "Singapore",
          },
        ]}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={firstWorkspace}
      />,
    );
    await waitFor(() => expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1));

    let confirmFirstPortfolio:
      ((value: Partial<PortfolioWorkspace>) => void) | undefined;
    getSummaryDetailsMock.mockReturnValueOnce(
      new Promise((resolve) => {
        confirmFirstPortfolio = resolve;
      }),
    );
    await act(async () => {
      screen.getByRole("button", { name: "Select YTD" }).click();
    });

    const secondWorkspace = buildWorkspace("MANUAL_PB_USD_002");
    getSummaryDetailsMock.mockResolvedValueOnce({ positions: [] });
    rerender(
      <PortfolioWorkspaceClient
        portfolios={[
          {
            portfolio_id: "MANUAL_PB_USD_002",
            display_name: "Second portfolio",
            base_currency: "USD",
            client_id: "MANUAL_CIF_002",
            booking_center_code: "Singapore",
          },
        ]}
        selectedPortfolioId="MANUAL_PB_USD_002"
        initialWorkspace={secondWorkspace}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("portfolio-id")).toHaveTextContent(
        "MANUAL_PB_USD_002",
      );
    });

    await act(async () => {
      confirmFirstPortfolio?.({
        as_of_date: "2026-03-28",
        positions: [],
      });
    });

    expect(screen.getByTestId("portfolio-id")).toHaveTextContent(
      "MANUAL_PB_USD_002",
    );
    expect(screen.getByTestId("time-window")).toHaveTextContent("30D");
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("does not duplicate summary fetches in strict mode and preserves explicit detail changes", async () => {
    getShellWorkspaceMock.mockResolvedValue(buildWorkspace());
    getSummaryDetailsMock.mockResolvedValue({
      positions: [{ security_id: "EQ_1" }],
      top_positions: [],
      allocations: [],
      allocation_views: [],
      income_summary: null,
      activity_summary: null,
    });
    render(
      <StrictMode>
        <PortfolioWorkspaceClient
          portfolios={[
            {
              portfolio_id: "MANUAL_PB_USD_001",
              display_name: "MANUAL_PB_USD_001",
              base_currency: "USD",
              client_id: "MANUAL_CIF_001",
              booking_center_code: "Singapore",
            },
          ]}
          selectedPortfolioId="MANUAL_PB_USD_001"
          initialWorkspace={buildWorkspace()}
        />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("portfolio-id")).toHaveTextContent(
        "MANUAL_PB_USD_001",
      );
    });

    expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1);
    expect(getSummaryDetailsMock).toHaveBeenCalledWith("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      reportingCurrency: "USD",
      includeProjected: false,
      timeWindow: "30D",
      reportStartDate: "2026-02-26",
      reportEndDate: "2026-03-28",
      usesCustomDateRange: false,
    });

    await act(async () => {
      screen.getByRole("button", { name: "Switch Detailed" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("view-mode")).toHaveTextContent("detailed");
    });

    expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1);
  });

  it("restores source-confirmed controls when automatic detail rejects URL-derived context", async () => {
    const initialWorkspace = buildWorkspace();
    getSummaryDetailsMock.mockResolvedValue({
      as_of_date: initialWorkspace.as_of_date,
      summary: {
        ...initialWorkspace.summary,
        market_value_base: 2000000.25,
      },
    });

    render(
      <PortfolioWorkspaceClient
        portfolios={buildPortfolioCatalog("MANUAL_PB_USD_001")}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={initialWorkspace}
        initialControls={{
          ...buildInitialPortfolioControls(initialWorkspace),
          asOfDate: "2026-03-20",
          timeWindow: "YTD",
        }}
      />,
    );

    await waitFor(() => expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1));
    expect(getSummaryDetailsMock).toHaveBeenCalledWith(
      "MANUAL_PB_USD_001",
      expect.objectContaining({ asOfDate: "2026-03-20" }),
    );
    expect(screen.getByTestId("market-value")).toHaveTextContent("1001550.05");
    expect(screen.getByTestId("time-window")).toHaveTextContent("30D");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Review context was not changed",
    );
    expect(screen.getByTestId("review-context-strip")).toHaveTextContent(
      "28 Mar 2026",
    );
    expect(screen.getByTestId("review-context-strip")).not.toHaveTextContent(
      "20 Mar 2026",
    );
    expect(routerReplaceMock).toHaveBeenCalledWith(
      "/portfolio?portfolioId=MANUAL_PB_USD_001&asOfDate=2026-03-28&period=30D&reportingCurrency=USD",
      { scroll: false },
    );
    expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1);
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("restores source-confirmed controls when automatic detail is unavailable", async () => {
    const initialWorkspace = buildWorkspace();
    getSummaryDetailsMock.mockResolvedValue(null);

    render(
      <PortfolioWorkspaceClient
        portfolios={buildPortfolioCatalog("MANUAL_PB_USD_001")}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={initialWorkspace}
        initialControls={{
          ...buildInitialPortfolioControls(initialWorkspace),
          asOfDate: "2026-03-20",
          timeWindow: "YTD",
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Review context was not changed",
      );
    });
    expect(screen.getByTestId("market-value")).toHaveTextContent("1001550.05");
    expect(screen.getByTestId("time-window")).toHaveTextContent("30D");
    expect(routerReplaceMock).toHaveBeenCalledWith(
      "/portfolio?portfolioId=MANUAL_PB_USD_001&asOfDate=2026-03-28&period=30D&reportingCurrency=USD",
      { scroll: false },
    );
    expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1);
  });

  it("withholds the current shell while source proof for URL-derived context is pending", async () => {
    const initialWorkspace = buildWorkspace();
    initialWorkspace.control_capabilities = {
      historical_snapshots: {
        state: "supported",
        reason: "available",
        requested_as_of_date: initialWorkspace.as_of_date,
        effective_as_of_date: initialWorkspace.as_of_date,
        module_capabilities: [],
      },
      reporting_currency_restatement: {
        state: "supported",
        reason: "available",
        requested_reporting_currency: "SGD",
        effective_reporting_currency: "USD",
        supported_currencies: ["USD", "SGD"],
        module_capabilities: [],
      },
    };
    getSummaryDetailsMock.mockReturnValue(new Promise(() => undefined));

    render(
      <PortfolioWorkspaceClient
        portfolios={buildPortfolioCatalog("MANUAL_PB_USD_001")}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={initialWorkspace}
        initialControls={{
          ...buildInitialPortfolioControls(initialWorkspace),
          asOfDate: "2026-03-20",
          reportingCurrency: "SGD",
        }}
      />,
    );

    await waitFor(() => expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1));
    const strip = screen.getByTestId("review-context-strip");
    expect(screen.getByTestId("shell-status")).toHaveTextContent("loading");
    expect(screen.getByTestId("market-value")).toHaveTextContent("none");
    expect(screen.getByTestId("portfolio-id")).toHaveTextContent("none");
    expect(strip).toHaveTextContent("Business dateNot confirmed");
    expect(strip).not.toHaveTextContent("28 Mar 2026");
    expect(strip).not.toHaveTextContent("20 Mar 2026");
    expect(within(strip).getByText("Base currency").parentElement).toHaveTextContent(
      "Not confirmed",
    );
  });

  it("promotes an alternate currency only after source detail confirms it", async () => {
    const initialWorkspace = buildWorkspace();
    initialWorkspace.control_capabilities = {
      historical_snapshots: {
        state: "supported",
        reason: "available",
        requested_as_of_date: initialWorkspace.as_of_date,
        effective_as_of_date: initialWorkspace.as_of_date,
        module_capabilities: [],
      },
      reporting_currency_restatement: {
        state: "supported",
        reason: "available",
        requested_reporting_currency: null,
        effective_reporting_currency: "USD",
        supported_currencies: ["USD", "SGD"],
        module_capabilities: [],
      },
    };
    getSummaryDetailsMock.mockResolvedValue({
      as_of_date: initialWorkspace.as_of_date,
      income_summary: { reporting_currency: "SGD" },
      activity_summary: { reporting_currency: "SGD" },
      positions: [],
    });

    render(
      <PortfolioWorkspaceClient
        portfolios={buildPortfolioCatalog("MANUAL_PB_USD_001")}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={initialWorkspace}
        initialControls={{
          ...buildInitialPortfolioControls(initialWorkspace),
          reportingCurrency: "SGD",
        }}
      />,
    );

    const strip = screen.getByTestId("review-context-strip");
    await waitFor(() => {
      expect(
        within(strip).getByText("Reporting currency").parentElement,
      ).toHaveTextContent("SGD");
    });
    expect(within(strip).queryByText("Base currency")).not.toBeInTheDocument();
  });

  it("renders default 30D holdings after the source confirms its EXPLICIT window", async () => {
    const initialWorkspace = buildWorkspace();
    getSummaryDetailsMock.mockResolvedValue({
      as_of_date: initialWorkspace.as_of_date,
      positions: [{ security_id: "EQ_1" }],
      performance: {
        period: "EXPLICIT",
        report_start_date: "2026-02-26",
        report_end_date: "2026-03-28",
      },
    });

    render(
      <PortfolioWorkspaceClient
        portfolios={buildPortfolioCatalog("MANUAL_PB_USD_001")}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={initialWorkspace}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("position-count")).toHaveTextContent("1");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("adopts a changed server-rendered workspace snapshot even when summary request parameters are unchanged", async () => {
    const firstDetailsRequest: {
      resolve: ((value: Partial<PortfolioWorkspace>) => void) | null;
    } = { resolve: null };
    getShellWorkspaceMock.mockResolvedValue(buildWorkspace());
    getSummaryDetailsMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          firstDetailsRequest.resolve = resolve;
        }),
      )
      .mockResolvedValueOnce({
        positions: [],
        top_positions: [],
        allocations: [],
        allocation_views: [],
        income_summary: null,
        activity_summary: null,
      });

    const initialWorkspace = buildWorkspace();
    const refreshedWorkspace = {
      ...buildWorkspace(),
      summary: {
        ...initialWorkspace.summary,
        market_value_base: 2000000.25,
      },
      readiness: {
        ...initialWorkspace.readiness,
        reporting: {
          status: "READY",
          generated_at_utc: "2026-03-28T12:30:00Z",
          row_count: 4,
        },
      },
      warnings: ["valuation_source_refreshed"],
    } satisfies PortfolioWorkspace;

    const { rerender } = render(
      <PortfolioWorkspaceClient
        portfolios={[
          {
            portfolio_id: "MANUAL_PB_USD_001",
            display_name: "MANUAL_PB_USD_001",
            base_currency: "USD",
            client_id: "MANUAL_CIF_001",
            booking_center_code: "Singapore",
          },
        ]}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={initialWorkspace}
      />,
    );

    await waitFor(() => {
      expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1);
    });

    rerender(
      <PortfolioWorkspaceClient
        portfolios={[
          {
            portfolio_id: "MANUAL_PB_USD_001",
            display_name: "MANUAL_PB_USD_001",
            base_currency: "USD",
            client_id: "MANUAL_CIF_001",
            booking_center_code: "Singapore",
          },
        ]}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={refreshedWorkspace}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("market-value")).toHaveTextContent(
        "2000000.25",
      );
    });
    await waitFor(() => {
      expect(getSummaryDetailsMock).toHaveBeenCalledTimes(2);
    });

    firstDetailsRequest.resolve?.({
      summary: {
        ...initialWorkspace.summary,
        market_value_base: 1001550.05,
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("market-value")).toHaveTextContent(
        "2000000.25",
      );
    });
  });

  it("recovers by fetching the portfolio shell when the server-rendered shell is unavailable", async () => {
    const recoveredWorkspace = buildWorkspace();

    getShellWorkspaceMock.mockResolvedValue(recoveredWorkspace);
    getSummaryDetailsMock.mockResolvedValue({
      positions: [{ security_id: "EQ_1" }],
      top_positions: [],
      allocations: [],
      allocation_views: [],
      income_summary: null,
      activity_summary: null,
    });
    render(
      <StrictMode>
        <PortfolioWorkspaceClient
          portfolios={[
            {
              portfolio_id: "MANUAL_PB_USD_001",
              display_name: "MANUAL_PB_USD_001",
              base_currency: "USD",
              client_id: "MANUAL_CIF_001",
              booking_center_code: "Singapore",
            },
          ]}
          selectedPortfolioId="MANUAL_PB_USD_001"
          initialWorkspace={null}
        />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("portfolio-id")).toHaveTextContent(
        "MANUAL_PB_USD_001",
      );
    });

    expect(getShellWorkspaceMock).toHaveBeenCalledTimes(1);
    expect(getShellWorkspaceMock).toHaveBeenCalledWith("MANUAL_PB_USD_001");
    await waitFor(() => {
      expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1);
    });
    expect(getSummaryDetailsMock).toHaveBeenCalledWith("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      reportingCurrency: "USD",
      includeProjected: false,
      timeWindow: "30D",
      reportStartDate: "2026-02-26",
      reportEndDate: "2026-03-28",
      usesCustomDateRange: false,
    });
  });

  it("withholds a foreign server-rendered shell and never publishes its identity", async () => {
    getShellWorkspaceMock.mockResolvedValue(null);

    render(
      <PortfolioWorkspaceClient
        portfolios={buildPortfolioCatalog("MANUAL_PB_USD_001")}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={buildWorkspace("PB_FOREIGN_001")}
        initialControls={buildInitialPortfolioControls(
          buildWorkspace("PB_FOREIGN_001"),
        )}
      />,
    );

    expect(screen.getByTestId("portfolio-id")).toHaveTextContent("none");
    expect(screen.queryByText("PB_FOREIGN_001")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("shell-status")).toHaveTextContent(
        "unavailable",
      );
    });
    expect(getShellWorkspaceMock).toHaveBeenCalledWith("MANUAL_PB_USD_001");
    expect(getSummaryDetailsMock).not.toHaveBeenCalled();
  });

  it("rejects a foreign recovery shell before requesting or rendering details", async () => {
    getShellWorkspaceMock.mockResolvedValue(buildWorkspace("PB_FOREIGN_001"));

    render(
      <PortfolioWorkspaceClient
        portfolios={buildPortfolioCatalog("MANUAL_PB_USD_001")}
        selectedPortfolioId="MANUAL_PB_USD_001"
        initialWorkspace={null}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("shell-status")).toHaveTextContent(
        "unavailable",
      );
    });
    expect(screen.getByTestId("portfolio-id")).toHaveTextContent("none");
    expect(screen.queryByText("PB_FOREIGN_001")).not.toBeInTheDocument();
    expect(getSummaryDetailsMock).not.toHaveBeenCalled();
  });

  it("stops after one unavailable shell request instead of retrying continuously", async () => {
    let resolveShell: ((value: PortfolioWorkspace | null) => void) | undefined;
    getShellWorkspaceMock.mockReturnValue(
      new Promise((resolve) => {
        resolveShell = resolve;
      }),
    );
    getSummaryDetailsMock.mockResolvedValue(null);

    render(
      <StrictMode>
        <PortfolioWorkspaceClient
          portfolios={[
            {
              portfolio_id: "MANUAL_PB_USD_001",
              display_name: "MANUAL_PB_USD_001",
              base_currency: "USD",
              client_id: "MANUAL_CIF_001",
              booking_center_code: "Singapore",
            },
          ]}
          selectedPortfolioId="MANUAL_PB_USD_001"
          initialWorkspace={null}
        />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(getShellWorkspaceMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("shell-status")).toHaveTextContent("loading");

    await act(async () => {
      resolveShell?.(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId("shell-status")).toHaveTextContent(
        "unavailable",
      );
    });
    expect(getShellWorkspaceMock).toHaveBeenCalledTimes(1);
    expect(getSummaryDetailsMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("portfolio-id")).toHaveTextContent("none");
    expect(getShellRecoveryStates()).toEqual(["loading", "error"]);
  });

  it("permits one fresh automatic attempt when the selected portfolio source key changes", async () => {
    const shellResolvers = new Map<
      string,
      (value: PortfolioWorkspace | null) => void
    >();
    getShellWorkspaceMock.mockImplementation(
      (portfolioId: string) =>
        new Promise<PortfolioWorkspace | null>((resolve) => {
          shellResolvers.set(portfolioId, resolve);
        }),
    );
    getSummaryDetailsMock.mockResolvedValue({
      positions: [],
      top_positions: [],
      allocations: [],
      allocation_views: [],
      income_summary: null,
      activity_summary: null,
    });

    const { rerender } = render(
      <PortfolioWorkspaceClient
        portfolios={buildPortfolioCatalog("PORTFOLIO_A")}
        selectedPortfolioId="PORTFOLIO_A"
        initialWorkspace={null}
      />,
    );

    await waitFor(() => {
      expect(getShellWorkspaceMock).toHaveBeenCalledWith("PORTFOLIO_A");
    });

    rerender(
      <PortfolioWorkspaceClient
        portfolios={buildPortfolioCatalog("PORTFOLIO_B")}
        selectedPortfolioId="PORTFOLIO_B"
        initialWorkspace={null}
      />,
    );

    await waitFor(() => {
      expect(getShellWorkspaceMock).toHaveBeenCalledWith("PORTFOLIO_B");
    });
    expect(getShellWorkspaceMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("shell-status")).toHaveTextContent("loading");

    await act(async () => {
      shellResolvers.get("PORTFOLIO_A")?.(buildWorkspace("PORTFOLIO_A"));
    });
    expect(screen.getByTestId("portfolio-id")).toHaveTextContent("none");
    expect(getSummaryDetailsMock).not.toHaveBeenCalled();

    await act(async () => {
      shellResolvers.get("PORTFOLIO_B")?.(buildWorkspace("PORTFOLIO_B"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("portfolio-id")).toHaveTextContent(
        "PORTFOLIO_B",
      );
    });
    await waitFor(() => {
      expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1);
    });
    expect(getSummaryDetailsMock).toHaveBeenCalledWith(
      "PORTFOLIO_B",
      expect.any(Object),
    );
    expect(getShellRecoveryStates()).toEqual(["loading", "loading", "ready"]);
  });

  it("does not publish terminal state or details after an in-flight recovery is unmounted", async () => {
    let resolveShell: ((value: PortfolioWorkspace | null) => void) | undefined;
    getShellWorkspaceMock.mockReturnValue(
      new Promise((resolve) => {
        resolveShell = resolve;
      }),
    );

    const { unmount } = render(
      <PortfolioWorkspaceClient
        portfolios={buildPortfolioCatalog("PORTFOLIO_A")}
        selectedPortfolioId="PORTFOLIO_A"
        initialWorkspace={null}
      />,
    );

    await waitFor(() => {
      expect(getShellWorkspaceMock).toHaveBeenCalledTimes(1);
    });
    unmount();

    await act(async () => {
      resolveShell?.(buildWorkspace("PORTFOLIO_A"));
    });

    expect(getSummaryDetailsMock).not.toHaveBeenCalled();
    expect(getShellRecoveryStates()).toEqual(["loading"]);
  });

  it("does not leave the workspace loading when no selected portfolio can be resolved", () => {
    render(
      <PortfolioWorkspaceClient
        portfolios={buildPortfolioCatalog("PORTFOLIO_A")}
        selectedPortfolioId={null}
        initialWorkspace={null}
      />,
    );

    expect(screen.getByTestId("shell-status")).toHaveTextContent("unavailable");
    expect(getShellWorkspaceMock).not.toHaveBeenCalled();
    expect(getShellRecoveryStates()).toEqual([]);
  });
});

function buildPortfolioCatalog(portfolioId: string) {
  return [
    {
      portfolio_id: portfolioId,
      display_name: portfolioId,
      base_currency: "USD",
      client_id: `CLIENT_${portfolioId}`,
      booking_center_code: "Singapore",
    },
  ];
}

function getShellRecoveryStates() {
  return getAnalyticsUiMetricEvents()
    .filter(
      (event) =>
        event.labels.operation === "portfolio.workspace.shell.recovery",
    )
    .map((event) => event.labels.state);
}
