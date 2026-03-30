import React, { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PortfolioWorkspaceClient from "../../src/apps/portfolio/components/portfolio-workspace-client";

const getSummaryDetailsMock = vi.fn();
const getDetailedDetailsMock = vi.fn();

vi.mock("../../src/apps/portfolio/api", () => ({
  getPortfolioWorkspaceSummaryDetails: (...args: unknown[]) => getSummaryDetailsMock(...args),
  getPortfolioWorkspaceDetailedDetails: (...args: unknown[]) => getDetailedDetailsMock(...args),
  mergePortfolioWorkspace: (current: any, details: any) => ({ ...current, ...details }),
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
    detailsLoading,
    workspace,
  }: {
    toolbar?: React.ReactNode;
    detailsLoading: boolean;
    workspace: { portfolio?: { portfolio_id?: string } } | null;
  }) => (
    <div>
      {toolbar}
      <div data-testid="details-loading">{String(detailsLoading)}</div>
      <div data-testid="portfolio-id">{workspace?.portfolio?.portfolio_id ?? "none"}</div>
    </div>
  ),
}));

function buildWorkspace() {
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
    workflow_cues: [],
    warnings: [],
    partial_failures: [],
  };
}

describe("PortfolioWorkspaceClient", () => {
  afterEach(() => {
    getSummaryDetailsMock.mockReset();
    getDetailedDetailsMock.mockReset();
    window.localStorage.clear();
  });

  it("does not duplicate summary or detailed fetches in strict mode", async () => {
    getSummaryDetailsMock.mockResolvedValue({
      positions: [{ security_id: "EQ_1" }],
      top_positions: [],
      allocations: [],
      allocation_views: [],
      income_summary: null,
      activity_summary: null,
    });
    getDetailedDetailsMock.mockResolvedValue({
      cash_balances: [],
      recent_transactions: [],
      cashflow_outlook: null,
      readiness_indicators: [{ key: "holdings", label: "Holdings", status: "Ready", href: "#x" }],
      exception_summaries: [],
      insights: [],
      workflow_actions: [],
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
          initialWorkspace={buildWorkspace() as any}
        />
      </StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByTestId("details-loading")).toHaveTextContent("false");
    });

    expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1);
    expect(getDetailedDetailsMock).toHaveBeenCalledTimes(0);

    await act(async () => {
      screen.getByRole("button", { name: "Switch Detailed" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("view-mode")).toHaveTextContent("detailed");
    });

    expect(getSummaryDetailsMock).toHaveBeenCalledTimes(1);
    expect(getDetailedDetailsMock).toHaveBeenCalledTimes(1);
    expect(getDetailedDetailsMock).toHaveBeenCalledWith("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      startDate: "2026-02-26",
      endDate: "2026-03-28",
    });
  });
});
