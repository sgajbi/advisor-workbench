import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  PortfolioAllocationSelection,
  PortfolioPositionView,
  PortfolioWorkspace,
} from "../../src/apps/portfolio/types";
import type { HoldingsRow } from "../../src/apps/portfolio/components/portfolio-holdings-grid";
import PortfolioAllocationRecordScreen from "../../src/apps/portfolio/components/portfolio-allocation-record-screen";
import PortfolioPositionsRecordScreen from "../../src/apps/portfolio/components/portfolio-positions-record-screen";
import PortfolioTransactionsRecordScreen from "../../src/apps/portfolio/components/portfolio-transactions-record-screen";
import { renderWithQueryClient } from "../helpers/query-client-test-harness";

type MockGridRow = { transactionId: string };
const routerPushMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname || "/positions",
  useRouter: () => ({ push: routerPushMock }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("ag-grid-react", () => ({
  AgGridReact: ({
    rowData = [],
    onRowClicked,
  }: {
    rowData?: MockGridRow[];
    onRowClicked?: (event: { data: MockGridRow }) => void;
  }) => (
    <div>
      {rowData.map((row) => (
        <button
          type="button"
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
  "../../src/apps/portfolio/components/portfolio-page-layout",
  () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }),
);

beforeEach(() => {
  window.history.replaceState(
    {},
    "",
    "/positions?portfolioId=PB_SG_GLOBAL_BAL_001",
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  routerPushMock.mockClear();
  window.history.replaceState({}, "", "/positions?portfolioId=PB_SG_GLOBAL_BAL_001");
});
vi.mock(
  "../../src/apps/portfolio/components/portfolio-screen-rail",
  () => ({ default: () => <nav aria-label="Portfolio screens" /> }),
);
vi.mock(
  "../../src/apps/portfolio/components/portfolio-record-evidence-rail",
  () => ({ default: () => <aside aria-label="Portfolio evidence" /> }),
);
vi.mock(
  "../../src/apps/portfolio/components/portfolio-allocation-panel",
  () => ({
    default: ({
      onSelectionChange,
      onExposureModeChange,
    }: {
      onSelectionChange: (
        selection: PortfolioAllocationSelection | null,
      ) => void;
      onExposureModeChange?: (mode: "direct" | "expanded") => void;
    }) => (
      <section aria-label="Allocation panel">
        <button
          type="button"
          onClick={() =>
            onSelectionChange({ dimension: "sector", bucket: "Technology" })
          }
        >
          Select Technology
        </button>
        <button
          type="button"
          onClick={() =>
            onSelectionChange({ dimension: "asset_class", bucket: "Cash" })
          }
        >
          Select Cash
        </button>
        <button
          type="button"
          onClick={() => {
            onSelectionChange(null);
            onExposureModeChange?.("expanded");
          }}
        >
          Use expanded exposure
        </button>
      </section>
    ),
  }),
);
vi.mock(
  "../../src/apps/portfolio/components/portfolio-holdings-grid",
  () => ({
    default: ({
      positions,
      kicker,
      title,
      description,
      filterLabel,
      onClearFilter,
      onRowSelect,
    }: {
      positions: PortfolioPositionView[];
      kicker?: string;
      title?: string;
      description?: string;
      filterLabel?: string | null;
      onClearFilter?: () => void;
      onRowSelect?: (row: HoldingsRow) => void;
    }) => (
      <section aria-label="Positions breakdown">
        <span>{kicker}</span>
        <h2>{title}</h2>
        <p>{description}</p>
        {filterLabel ? <strong>{filterLabel}</strong> : null}
        {positions.map((position) =>
          onRowSelect ? (
            <button
              type="button"
              key={position.security_id}
              onClick={() =>
                onRowSelect({
                  securityId: position.security_id,
                  instrument: position.instrument_name,
                  assetClass: position.asset_class ?? "N/A",
                  quantity: position.quantity,
                  price: position.market_price ?? null,
                  marketValue: position.market_value_base,
                  costBasis: position.cost_basis_base ?? null,
                  weight: position.weight_pct,
                  upl: position.unrealized_gain_loss_base ?? null,
                  currency: position.currency ?? "USD",
                  status: position.reprocessing_status?.trim()
                    ? position.reprocessing_status.trim().toUpperCase() === "CURRENT"
                      ? "Current"
                      : "Review required"
                    : "Not reported",
                  statusKind: position.reprocessing_status?.trim()
                    ? position.reprocessing_status.trim().toUpperCase() === "CURRENT"
                      ? "current"
                      : "review_required"
                    : "not_reported",
                  statusTone:
                    position.reprocessing_status?.trim().toUpperCase() === "CURRENT"
                      ? "clear"
                      : "warn",
                  sector: position.sector ?? "N/A",
                  heldSince: position.held_since_date ?? null,
                  isin: position.isin ?? null,
                  raw: position,
                })
              }
            >
              Review {position.instrument_name}
            </button>
          ) : (
            <div key={position.security_id}>{position.instrument_name}</div>
          ),
        )}
        {filterLabel ? (
          <button type="button" onClick={onClearFilter}>
            Clear exposure
          </button>
        ) : null}
      </section>
    ),
  }),
);
vi.mock(
  "../../src/apps/portfolio/components/portfolio-detail-drawer-controller",
  () => ({
    default: ({
      detailDrawer,
      onClose,
    }: {
      detailDrawer: {
        title: string;
        tabs: Array<{ key: string; label: string; content: ReactNode }>;
        fullPageHref?: string;
        fullPageLabel?: string;
      } | null;
      onClose: () => void;
    }) =>
      detailDrawer ? (
        <aside aria-label="Position review drawer">
          <h2>{detailDrawer.title}</h2>
          {detailDrawer.tabs.map((tab) => (
            <section key={tab.key} aria-label={tab.label}>
              {tab.content}
            </section>
          ))}
          {detailDrawer.fullPageHref && detailDrawer.fullPageLabel ? (
            <a href={detailDrawer.fullPageHref}>{detailDrawer.fullPageLabel}</a>
          ) : null}
          <button type="button" onClick={onClose}>Close position review</button>
        </aside>
      ) : null,
  }),
);

describe("PortfolioRecordScreenClient allocation flow", () => {
  it("connects direct exposure selection to contributing positions and clears it", () => {
    render(
      <PortfolioAllocationRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={buildWorkspace()}
      />,
    );

    expect(screen.getByText("Exposure contributors")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Positions" })).toBeInTheDocument();
    expect(screen.getByText("US Technology Equity")).toBeInTheDocument();
    expect(screen.getByText("Singapore Government Bond")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select Technology" }));

    expect(
      screen.getByRole("heading", { name: "Contributing positions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sector: Technology")).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 of 3 positions contribute to this direct exposure.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("US Technology Equity")).toBeInTheDocument();
    expect(screen.queryByText("Singapore Government Bond")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear exposure" }));

    expect(screen.getByRole("heading", { name: "Positions" })).toBeInTheDocument();
    expect(screen.getByText("Singapore Government Bond")).toBeInTheDocument();
  });

  it("renders source cash balances as direct cash contributors", () => {
    render(
      <PortfolioAllocationRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={buildWorkspace()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Cash" }));

    expect(screen.getByText("Asset Class: Cash")).toBeInTheDocument();
    expect(screen.getByText("USD Operating Cash")).toBeInTheDocument();
    expect(screen.queryByText("US Technology Equity")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "1 of 3 positions contribute to this direct exposure.",
      ),
    ).toBeInTheDocument();
  });

  it("resets allocation review state when the portfolio identity changes", () => {
    const { rerender } = render(
      <PortfolioAllocationRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={buildWorkspace()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Technology" }));
    expect(screen.getByText("Sector: Technology")).toBeInTheDocument();

    const nextWorkspace = buildWorkspace();
    nextWorkspace.portfolio.portfolio_id = "PB_SG_INCOME_002";
    nextWorkspace.portfolio.display_name = "Income Mandate";
    rerender(
      <PortfolioAllocationRecordScreen
        portfolioId="PB_SG_INCOME_002"
        portfolioContext={null}
        workspace={nextWorkspace}
      />,
    );

    expect(screen.getByRole("heading", { name: "Positions" })).toBeInTheDocument();
    expect(screen.queryByText("Sector: Technology")).not.toBeInTheDocument();
    expect(screen.getByText("US Technology Equity")).toBeInTheDocument();
    expect(screen.getByText("Singapore Government Bond")).toBeInTheDocument();
  });

  it("keeps booked holdings distinct from unavailable expanded contributors", () => {
    render(
      <PortfolioAllocationRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={buildWorkspace()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Technology" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Use expanded exposure" }),
    );

    expect(screen.getByRole("heading", { name: "Positions" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Positions are shown for reference. Expanded exposure contributors require source-backed look-through detail.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sector: Technology")).not.toBeInTheDocument();
    expect(screen.getByText("US Technology Equity")).toBeInTheDocument();
    expect(screen.getByText("Singapore Government Bond")).toBeInTheDocument();
  });
});

describe("PortfolioRecordScreenClient positions flow", () => {
  it("shows point-in-time portfolio composition and opens source-backed position activity", () => {
    const workspace = buildWorkspace();
    workspace.summary = {
      ...workspace.summary,
      market_value_base: 1_100,
      invested_market_value_base: 1_000,
      total_cash_base: 100,
      cash_weight_pct: 9.09,
      cash_balance_count: 1,
    };
    workspace.recent_transactions = [
      {
        transaction_id: "TX_EQ_1",
        transaction_date: "2026-04-08",
        transaction_type: "BUY",
        security_id: "EQ_US_1",
        instrument_id: "US_TECH",
        quantity: 1,
        gross_amount: 100,
        currency: "USD",
      },
      {
        transaction_id: "TX_FI_1",
        transaction_date: "2026-04-09",
        transaction_type: "BUY",
        security_id: "FI_SG_1",
        instrument_id: "SG_BOND",
        quantity: 1,
        gross_amount: 200,
        currency: "SGD",
      },
    ];

    render(
      <PortfolioPositionsRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={workspace}
      />,
    );

    expect(screen.getByText("Invested")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.queryByText("Window")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review USD Operating Cash" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Review US Technology Equity" }),
    );

    expect(screen.getByRole("complementary", { name: "Position review drawer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "US Technology Equity" })).toBeInTheDocument();
    expect(screen.getByLabelText("Recent activity")).toHaveTextContent(
      "Recent booked activity supplied with the portfolio review as of 10 Apr 2026",
    );
    expect(screen.getByText("US_TECH · 100 USD gross")).toBeInTheDocument();
    expect(screen.queryByText("SG_BOND · 200 SGD")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open transactions" })).toHaveAttribute(
      "href",
      "/transactions?portfolioId=PB_SG_GLOBAL_BAL_001",
    );
    expect(routerPushMock).toHaveBeenCalledWith(
      "/positions?portfolioId=PB_SG_GLOBAL_BAL_001&selectedRecordId=EQ_US_1",
      { scroll: false },
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Close position review" }),
    );
    expect(
      screen.queryByRole("complementary", { name: "Position review drawer" }),
    ).not.toBeInTheDocument();
    expect(routerPushMock).toHaveBeenLastCalledWith(
      "/positions?portfolioId=PB_SG_GLOBAL_BAL_001",
      { scroll: false },
    );
  });

  it("rehydrates a source-confirmed holding from the address", () => {
    render(
      <PortfolioPositionsRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={buildWorkspace()}
        selectedRecordId="FI_SG_1"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Singapore Government Bond" }),
    ).toBeInTheDocument();
  });

  it("does not substitute another holding when addressed identity is absent", () => {
    render(
      <PortfolioPositionsRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={buildWorkspace()}
        selectedRecordId="NOT_IN_BOOK"
      />,
    );

    expect(
      screen.getByText("Position is not in this confirmed portfolio view"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Position review drawer" }),
    ).not.toBeInTheDocument();
  });

  it("follows Back and Forward style address changes without retaining stale detail", () => {
    const workspace = buildWorkspace();
    const { rerender } = render(
      <PortfolioPositionsRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={workspace}
        selectedRecordId="EQ_US_1"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "US Technology Equity" }),
    ).toBeInTheDocument();

    rerender(
      <PortfolioPositionsRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={workspace}
      />,
    );
    expect(
      screen.queryByRole("complementary", { name: "Position review drawer" }),
    ).not.toBeInTheDocument();

    rerender(
      <PortfolioPositionsRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={workspace}
        selectedRecordId="FI_SG_1"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Singapore Government Bond" }),
    ).toBeInTheDocument();
  });

  it("keeps unavailable cash and activity detail visibly partial", () => {
    const workspace = buildWorkspace();
    workspace.cash_balances = [];
    workspace.recent_transactions = [];
    workspace.record_data_availability = {
      positions: "ready",
      liquidity: "unavailable",
      transactions: "unavailable",
    };

    render(
      <PortfolioPositionsRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={workspace}
      />,
    );

    expect(screen.getByText("Positions review partially available")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Cash-balance detail and recent position activity are temporarily unavailable. Available source records remain visible.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Positions", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Booked portfolio inventory", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review USD Operating Cash" })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Review US Technology Equity" }),
    );
    expect(screen.getByLabelText("Recent activity")).toHaveTextContent(
      "We could not load recent booked activity for this position.",
    );
  });
});

describe("PortfolioRecordScreenClient transactions flow", () => {
  beforeEach(() => {
    window.history.replaceState(
      {},
      "",
      "/transactions?portfolioId=PB_SG_GLOBAL_BAL_001",
    );
  });

  it("resets record and related-event review when the portfolio identity changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ total: 0, skip: 0, limit: 200, transactions: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const firstWorkspace = buildWorkspaceWithTransaction(
      "PB_SG_GLOBAL_BAL_001",
      "TX_FIRST",
      "FXC-FIRST",
    );
    const { rerender } = renderWithQueryClient(
      <PortfolioTransactionsRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={firstWorkspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review TX_FIRST" }));
    expect(screen.getByRole("heading", { name: "Buy" })).toBeInTheDocument();
    expect(routerPushMock).toHaveBeenLastCalledWith(
      "/transactions?portfolioId=PB_SG_GLOBAL_BAL_001&selectedRecordId=TX_FIRST",
      { scroll: false },
    );

    const secondWorkspace = buildWorkspaceWithTransaction(
      "PB_SG_INCOME_002",
      "TX_SECOND",
      "FXC-SECOND",
    );
    rerender(
      <PortfolioTransactionsRecordScreen
        portfolioId="PB_SG_INCOME_002"
        portfolioContext={null}
        workspace={secondWorkspace}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Buy" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review TX_SECOND" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Open FX Contract Transactions" }),
    );
    expect(screen.getByText("FX contract FXC-SECOND")).toBeInTheDocument();
    expect(routerPushMock).toHaveBeenLastCalledWith(
      "/transactions?portfolioId=PB_SG_INCOME_002",
      { scroll: false },
    );

    const thirdWorkspace = buildWorkspaceWithTransaction(
      "PB_SG_PRESERVATION_003",
      "TX_THIRD",
      "FXC-THIRD",
    );
    rerender(
      <PortfolioTransactionsRecordScreen
        portfolioId="PB_SG_PRESERVATION_003"
        portfolioContext={null}
        workspace={thirdWorkspace}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("FX contract FXC-SECOND")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Review TX_THIRD" })).toBeInTheDocument();
  });

  it("rehydrates an addressed transaction through exact source evidence", async () => {
    const workspace = buildWorkspaceWithTransaction(
      "PB_SG_GLOBAL_BAL_001",
      "TX_DIRECT",
      "FXC-DIRECT",
    );
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          correlation_id: "corr-exact",
          contract_version: "v1",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          reporting_currency: "SGD",
          transaction: {
            ...workspace.recent_transactions[0],
            transaction_id: "TX_NOT_IN_WINDOW",
          },
          reason_codes: ["TRANSACTION_LEDGER_READY"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = renderWithQueryClient(
      <PortfolioTransactionsRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={workspace}
        selectedRecordId="TX_DIRECT"
      />,
    );

    expect(screen.getByRole("heading", { name: "Buy" })).toBeInTheDocument();

    rerender(
      <PortfolioTransactionsRecordScreen
        portfolioId="PB_SG_GLOBAL_BAL_001"
        portfolioContext={null}
        workspace={workspace}
        selectedRecordId="TX_NOT_IN_WINDOW"
      />,
    );
    expect(await screen.findByRole("heading", { name: "Buy" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function buildWorkspace(): PortfolioWorkspace {
  return {
    as_of_date: "2026-04-10",
    portfolio: {
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
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
    },
    summary: {
      market_value_base: 1_000,
      invested_market_value_base: 1_000,
      total_cash_base: 0,
      cash_weight_pct: 0,
      position_count: 2,
      cash_balance_count: 0,
    },
    allocations: [],
    allocation_views: [
      {
        dimension: "sector",
        buckets: [
          {
            bucket: "Technology",
            position_count: 1,
            market_value_base: 600,
            weight_pct: 60,
          },
        ],
      },
    ],
    cash_balances: [
      {
        security_id: "CASH_USD_1",
        instrument_name: "USD Operating Cash",
        currency: "USD",
        quantity: 100,
        market_value_base: 100,
        weight_pct: 10,
      },
    ],
    top_positions: [],
    positions: [
      {
        security_id: "EQ_US_1",
        instrument_name: "US Technology Equity",
        asset_class: "Equities",
        currency: "USD",
        sector: "Technology",
        country_of_risk: "United States",
        quantity: 10,
        market_value_base: 600,
        weight_pct: 60,
      },
      {
        security_id: "FI_SG_1",
        instrument_name: "Singapore Government Bond",
        asset_class: "Fixed Income",
        currency: "SGD",
        sector: "Government",
        country_of_risk: "Singapore",
        quantity: 4,
        market_value_base: 400,
        weight_pct: 40,
      },
    ],
    recent_transactions: [],
    income_summary: null,
    activity_summary: null,
    cashflow_outlook: null,
    performance: null,
    rebalance: null,
    control_capabilities: null,
    readiness: {
      has_positions: true,
      reporting: {
        status: "READY",
        generated_at_utc: "2026-04-10T00:00:00Z",
        row_count: 2,
      },
    },
    workflow_cues: [],
    workflow_actions: [],
    warnings: [],
    partial_failures: [],
  };
}

function buildWorkspaceWithTransaction(
  portfolioId: string,
  transactionId: string,
  fxContractId: string,
): PortfolioWorkspace {
  const workspace = buildWorkspace();
  workspace.portfolio.portfolio_id = portfolioId;
  workspace.recent_transactions = [
    {
      transaction_id: transactionId,
      transaction_date: "2026-04-10",
      settlement_date: "2026-04-12",
      transaction_type: "BUY",
      component_type: "TRADE",
      security_id: `SEC_${transactionId}`,
      instrument_id: `Instrument ${transactionId}`,
      quantity: 10,
      gross_amount: 1_000,
      currency: "USD",
      net_cost_base: 1_000,
      settlement_status: "SETTLED",
      fx_contract_id: fxContractId,
    },
  ];
  workspace.transaction_ledger_page = { total: 1, skip: 0, limit: 200 };
  return workspace;
}
