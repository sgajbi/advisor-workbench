import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("ag-grid-react", () => ({
  AgGridReact: ({ rowData = [], onRowClicked }: any) => (
    <div>
      {rowData.map((row: any) => (
        <button
          key={row.transactionId}
          onClick={() => onRowClicked?.({ data: row })}
        >
          Review {row.transactionId}
        </button>
      ))}
    </div>
  ),
}));

vi.mock(
  "../../src/apps/portfolio/components/portfolio-detail-drawer-controller",
  () => ({
    default: ({ detailDrawer }: any) =>
      detailDrawer ? (
        <aside>
          <h2>{detailDrawer.title}</h2>
          {detailDrawer.tabs.map((tab: any) => (
            <React.Fragment key={tab.key}>{tab.content}</React.Fragment>
          ))}
        </aside>
      ) : null,
  }),
);

import PortfolioTransactionsRecordWorkspace from "../../src/apps/portfolio/components/portfolio-transactions-record-workspace";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";

describe("portfolio transactions record workspace", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens booked-event detail and applies a supported FX contract drill-down", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ total: 1, skip: 0, limit: 200, transactions: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PortfolioTransactionsRecordWorkspace
        workspace={buildWorkspace()}
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review TX_1" }));
    expect(screen.getByRole("heading", { name: "Buy" })).toBeInTheDocument();
    expect(screen.getAllByText("FXC-2026-0001").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: "Open FX Contract Transactions" }),
    );

    expect(screen.getByText("FX contract FXC-2026-0001")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      String((fetchMock.mock.calls as unknown[][])[0]?.[0] ?? ""),
    ).toContain("fx_contract_id=FXC-2026-0001");
  });
});

function buildWorkspace(): PortfolioWorkspace {
  return {
    as_of_date: "2026-03-28",
    portfolio: {
      portfolio_id: "MANUAL_PB_USD_001",
      display_name: "Global Balanced Mandate",
      client_id: "CIF_SG_000184",
      base_currency: "USD",
      booking_center_code: "SG",
    },
    profile: {
      status: "ACTIVE",
      portfolio_type: "DISCRETIONARY",
      risk_exposure: "BALANCED",
      investment_time_horizon: "LONG_TERM",
      objective: "Growth and income",
      is_leverage_allowed: false,
      advisor_id: "RM_SG_001",
      open_date: "2025-01-06",
    },
    summary: {
      market_value_base: 1000000,
      total_cash_base: 80000,
      cash_weight_pct: 8,
      position_count: 11,
      cash_balance_count: 1,
    },
    allocations: [],
    cash_balances: [],
    top_positions: [],
    positions: [],
    recent_transactions: [
      {
        transaction_id: "TX_1",
        transaction_date: "2026-03-20T00:00:00Z",
        settlement_date: "2026-03-24",
        transaction_type: "BUY",
        component_type: "TRADE",
        security_id: "EQ_1",
        instrument_id: "AAPL",
        quantity: 50,
        gross_amount: 8500,
        currency: "EUR",
        net_cost_base: 9000,
        settlement_status: "SETTLED",
        fx_contract_id: "FXC-2026-0001",
      },
    ],
    transaction_ledger_page: { total: 1, skip: 0, limit: 200 },
    income_summary: null,
    activity_summary: null,
    cashflow_outlook: null,
    performance: null,
    rebalance: null,
    control_capabilities: null,
    readiness: {
      has_positions: true,
      reporting: { status: "READY", generated_at_utc: null, row_count: 11 },
    },
    workflow_cues: [],
    workflow_actions: [],
    warnings: [],
    partial_failures: [],
  };
}
