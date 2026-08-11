import React, { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";
import PortfolioWorkspaceClient from "../../src/apps/portfolio/components/portfolio-workspace-client";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";

const getSummaryDetailsMock = vi.fn();
const getShellWorkspaceMock = vi.fn();

vi.mock("../../src/apps/portfolio/api", () => ({
  getPortfolioWorkspaceShell: (...args: unknown[]) => getShellWorkspaceMock(...args),
  getPortfolioWorkspaceSummaryDetails: (...args: unknown[]) => getSummaryDetailsMock(...args),
  mergePortfolioWorkspace: (
    current: PortfolioWorkspace,
    details: Partial<PortfolioWorkspace>
  ) => ({ ...current, ...details }),
}));

vi.mock("../../src/apps/portfolio/components/portfolio-workspace-toolbar", () => ({
  default: ({
    controls,
    onControlsChange,
  }: {
    controls: { viewMode: "summary" | "detailed" };
    onControlsChange: (patch: { viewMode?: "summary" | "detailed" }) => void;
  }) => (
    <div>
      <div data-testid="view-mode">{controls.viewMode}</div>
      <button type="button" onClick={() => onControlsChange({ viewMode: "detailed" })}>
        Switch Detailed
      </button>
    </div>
  ),
}));

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
      <div data-testid="portfolio-id">{workspace?.portfolio?.portfolio_id ?? "none"}</div>
      <div data-testid="market-value">{workspace?.summary?.market_value_base ?? "none"}</div>
      <div data-testid="insight-key">{workspace?.insights?.[0]?.key ?? "none"}</div>
      <div data-testid="exception-key">{workspace?.exception_summaries?.[0]?.key ?? "none"}</div>
      <div data-testid="workflow-action">{workspace?.workflow_actions?.[0]?.title ?? "none"}</div>
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
    resetAnalyticsUiMetricEvents();
    window.localStorage.clear();
  });

  it("does not duplicate summary fetches in strict mode and ignores legacy detailed mode changes", async () => {
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
      </StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByTestId("portfolio-id")).toHaveTextContent("MANUAL_PB_USD_001");
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
      expect(screen.getByTestId("view-mode")).toHaveTextContent("summary");
    });

    expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1);
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
        })
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
      />
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
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("market-value")).toHaveTextContent("2000000.25");
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
      expect(screen.getByTestId("market-value")).toHaveTextContent("2000000.25");
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
      </StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByTestId("portfolio-id")).toHaveTextContent("MANUAL_PB_USD_001");
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
      </StrictMode>
    );

    await waitFor(() => {
      expect(getShellWorkspaceMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("shell-status")).toHaveTextContent("loading");

    await act(async () => {
      resolveShell?.(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId("shell-status")).toHaveTextContent("unavailable");
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
      expect(screen.getByTestId("portfolio-id")).toHaveTextContent("PORTFOLIO_B");
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
