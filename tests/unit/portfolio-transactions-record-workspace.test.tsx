import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockTransactionRow = { transactionId: string };
type MockDetailDrawer = {
  title: string;
  tabs: Array<{ key: string; content: React.ReactNode }>;
};
const routerPushMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: routerPushMock }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("ag-grid-react", () => ({
  AgGridReact: ({
    rowData = [],
    onRowClicked,
  }: {
    rowData?: MockTransactionRow[];
    onRowClicked?: (event: { data: MockTransactionRow }) => void;
  }) => (
    <div>
      {rowData.map((row) => (
        <button
          key={row.transactionId}
          data-transaction-review-id={row.transactionId}
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
    default: ({
      detailDrawer,
      onClose,
    }: {
      detailDrawer?: MockDetailDrawer | null;
      onClose: () => void;
    }) =>
      detailDrawer ? (
        <aside>
          <h2>{detailDrawer.title}</h2>
          {detailDrawer.tabs.map((tab) => (
            <React.Fragment key={tab.key}>{tab.content}</React.Fragment>
          ))}
          <button onClick={onClose}>Close</button>
        </aside>
      ) : null,
  }),
);

import PortfolioTransactionsRecordWorkspace from "../../src/apps/portfolio/components/portfolio-transactions-record-workspace";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";
import { WORKBENCH_QUERY_GC_TIME_MS } from "../../src/features/platform-runtime/query-policy";
import {
  createTestQueryClient,
  renderWithQueryClient,
} from "../helpers/query-client-test-harness";

describe("portfolio transactions record workspace", () => {
  beforeEach(() => {
    onlineManager.setOnline(true);
    window.history.replaceState(
      {},
      "",
      "/transactions?portfolioId=MANUAL_PB_USD_001&period=30D",
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
    vi.unstubAllGlobals();
    routerPushMock.mockClear();
  });

  it("opens booked-event detail and applies a supported FX contract drill-down", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ total: 1, skip: 0, limit: 200, transactions: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(
      <PortfolioTransactionsRecordWorkspace
        workspace={buildWorkspace()}
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        reportingCurrency="USD"
      />,
    );

    const reviewTransactionButton = screen.getByRole("button", {
      name: "Review TX_1",
    });
    reviewTransactionButton.focus();
    fireEvent.click(reviewTransactionButton);
    expect(screen.getByRole("heading", { name: "Buy" })).toBeInTheDocument();
    expect(screen.getAllByText("FXC-2026-0001").length).toBeGreaterThan(0);
    expect(routerPushMock).toHaveBeenCalledWith(
      "/transactions?portfolioId=MANUAL_PB_USD_001&period=30D&selectedRecordId=TX_1",
      { scroll: false },
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Review TX_1" })).toHaveFocus(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Review TX_1" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Open FX Contract Transactions" }),
    );

    expect(screen.getByText("FX contract FXC-2026-0001")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      String((fetchMock.mock.calls as unknown[][])[0]?.[0] ?? ""),
    ).toContain("fx_contract_id=FXC-2026-0001");
  });

  it("cancels pending focus restoration when the transaction workspace unmounts", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              total: 1,
              skip: 0,
              limit: 200,
              transactions: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    const view = renderWithQueryClient(
      <PortfolioTransactionsRecordWorkspace
        workspace={buildWorkspace()}
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        reportingCurrency="USD"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review TX_1" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
    expect(() => vi.advanceTimersByTime(300)).not.toThrow();
  });

  it("cancels pending focus restoration when another transaction review opens", () => {
    vi.useFakeTimers();
    const workspace = buildWorkspace();
    workspace.recent_transactions.push({
      ...workspace.recent_transactions[0],
      transaction_id: "TX_2",
      instrument_id: "MSFT",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              total: 1,
              skip: 0,
              limit: 200,
              transactions: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    renderWithQueryClient(
      <PortfolioTransactionsRecordWorkspace
        workspace={workspace}
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        reportingCurrency="USD"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review TX_1" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(vi.getTimerCount()).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Review TX_2" }));

    expect(vi.getTimerCount()).toBe(0);
    expect(() => vi.advanceTimersByTime(300)).not.toThrow();
    expect(routerPushMock).toHaveBeenLastCalledWith(
      "/transactions?portfolioId=MANUAL_PB_USD_001&period=30D&selectedRecordId=TX_2",
      { scroll: false },
    );
  });

  it("rehydrates an addressed transaction outside the loaded page with one exact read", async () => {
    window.history.replaceState(
      {},
      "",
      "/transactions?portfolioId=MANUAL_PB_USD_001&period=30D&selectedRecordId=TX_250",
    );
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(buildExactRecord("TX_250")), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(
      <PortfolioTransactionsRecordWorkspace
        workspace={buildWorkspace()}
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        initialSelectedRecordId="TX_250"
        reportingCurrency="SGD"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Sell" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls as unknown[][])[0]?.[0])).toContain(
      "/portfolio/portfolios/MANUAL_PB_USD_001/transactions/TX_250?as_of_date=2026-03-28&include_projected=false&reporting_currency=SGD",
    );
  });

  it("does not repeat the exact read on focus, reconnect, or remount within one hydration", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(buildExactRecord("TX_250")), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = createTestQueryClient();
    const workspace = (
      <PortfolioTransactionsRecordWorkspace
        workspace={buildWorkspace()}
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        initialSelectedRecordId="TX_250"
        reportingCurrency="SGD"
      />
    );
    const firstMount = renderWithQueryClient(workspace, queryClient);

    expect(
      await screen.findByRole("heading", { name: "Sell" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    firstMount.unmount();
    vi.advanceTimersByTime(WORKBENCH_QUERY_GC_TIME_MS + 1);
    vi.useRealTimers();
    renderWithQueryClient(workspace, queryClient);
    expect(
      await screen.findByRole("heading", { name: "Sell" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retains a failed exact read beyond collection and retries only when the adviser requests recovery", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: { code: "portfolio_transaction_source_unavailable" },
          }),
          { status: 502, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(buildExactRecord("TX_250")), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = createTestQueryClient();
    const workspace = (
      <PortfolioTransactionsRecordWorkspace
        workspace={buildWorkspace()}
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        initialSelectedRecordId="TX_250"
        reportingCurrency="SGD"
      />
    );

    const firstMount = renderWithQueryClient(workspace, queryClient);

    expect(
      await screen.findByText("Transaction source temporarily unavailable"),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    firstMount.unmount();
    vi.advanceTimersByTime(WORKBENCH_QUERY_GC_TIME_MS + 1);
    vi.useRealTimers();
    renderWithQueryClient(workspace, queryClient);

    expect(
      await screen.findByText("Transaction source temporarily unavailable"),
    ).toBeInTheDocument();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry transaction" }));

    expect(
      await screen.findByRole("heading", { name: "Sell" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["an empty body", ""],
    ["malformed JSON", "{"],
  ])("keeps %s distinct as unverified transaction evidence", async (_case, body) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    renderWithQueryClient(
      <PortfolioTransactionsRecordWorkspace
        workspace={buildWorkspace()}
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        initialSelectedRecordId="TX_250"
        reportingCurrency="SGD"
      />,
    );

    expect(
      await screen.findByText("Transaction evidence could not be verified"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review TX_1" }),
    ).toBeInTheDocument();
  });

  it.each([
    [404, "portfolio_transaction_not_found", "Transaction no longer available"],
    [
      403,
      "portfolio_transaction_access_denied",
      "Transaction access restricted",
    ],
    [
      502,
      "portfolio_transaction_source_unavailable",
      "Transaction source temporarily unavailable",
    ],
  ])("keeps source failure %s distinct", async (status, code, title) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: { code } }), {
            status,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    renderWithQueryClient(
      <PortfolioTransactionsRecordWorkspace
        workspace={buildWorkspace()}
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        initialSelectedRecordId="TX_250"
        reportingCurrency="USD"
      />,
    );

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review TX_1" }),
    ).toBeInTheDocument();
  });

  it("does not let a delayed prior address replace the current transaction", async () => {
    let resolveOldResponse!: (response: Response) => void;
    const oldResponse = new Promise<Response>((resolve) => {
      resolveOldResponse = resolve;
    });
    const fetchMock = vi.fn((input: string | URL) =>
      input.toString().includes("TX_OLD")
        ? oldResponse
        : Promise.resolve(
            new Response(JSON.stringify(buildExactRecord("TX_CURRENT")), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = renderWithQueryClient(
      <PortfolioTransactionsRecordWorkspace
        workspace={buildWorkspace()}
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        initialSelectedRecordId="TX_OLD"
        reportingCurrency="USD"
      />,
    );

    result.rerender(
      <PortfolioTransactionsRecordWorkspace
        workspace={buildWorkspace()}
        asOfDate="2026-03-28"
        defaultStartDate="2026-03-01"
        defaultEndDate="2026-03-28"
        initialSelectedRecordId="TX_CURRENT"
        reportingCurrency="USD"
      />,
    );
    expect(
      await screen.findByRole("heading", { name: "Sell" }),
    ).toBeInTheDocument();

    resolveOldResponse(
      new Response(JSON.stringify(buildExactRecord("TX_OLD")), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText("TX_CURRENT")).toBeInTheDocument();
    expect(screen.queryByText("TX_OLD")).not.toBeInTheDocument();
  });
});

function buildExactRecord(transactionId: string) {
  return {
    correlation_id: "corr-exact-transaction",
    contract_version: "v1",
    portfolio_id: "MANUAL_PB_USD_001",
    reporting_currency: "SGD",
    transaction: {
      transaction_id: transactionId,
      transaction_date: "2026-03-19T00:00:00Z",
      transaction_type: "SELL",
      security_id: "EQ_2",
      instrument_id: "MSFT",
      quantity: 20,
      currency: "SGD",
    },
    reason_codes: ["TRANSACTION_LEDGER_READY"],
  };
}

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
