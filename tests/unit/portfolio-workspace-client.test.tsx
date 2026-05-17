import React, { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";
import PortfolioWorkspaceClient from "../../src/apps/portfolio/components/portfolio-workspace-client";

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
  }: {
    toolbar?: React.ReactNode;
    workspace: PortfolioWorkspace | null;
  }) => (
    <div>
      {toolbar}
      <div data-testid="portfolio-id">{workspace?.portfolio?.portfolio_id ?? "none"}</div>
      <div data-testid="insight-key">{workspace?.insights?.[0]?.key ?? "none"}</div>
      <div data-testid="exception-key">{workspace?.exception_summaries?.[0]?.key ?? "none"}</div>
      <div data-testid="workflow-action">{workspace?.workflow_actions?.[0]?.title ?? "none"}</div>
    </div>
  ),
}));

function buildWorkspace(): PortfolioWorkspace {
  return {
    as_of_date: "2026-03-28",
    portfolio: {
      portfolio_id: "MANUAL_PB_USD_001",
      display_name: "MANUAL_PB_USD_001",
      client_id: "MANUAL_CIF_001",
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
});
