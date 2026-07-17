import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  PortfolioAllocationSelection,
  PortfolioPositionView,
  PortfolioWorkspace,
} from "../../src/apps/portfolio/types";
import type { HoldingsRow } from "../../src/apps/portfolio/components/portfolio-holdings-grid";
import PortfolioRecordScreenClient from "../../src/apps/portfolio/components/portfolio-record-screen-client";

vi.mock(
  "../../src/apps/portfolio/components/portfolio-page-layout",
  () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }),
);
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
      <section aria-label="Holdings breakdown">
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
                  status: position.reprocessing_status,
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
      } | null;
      onClose: () => void;
    }) =>
      detailDrawer ? (
        <aside aria-label="Holding review drawer">
          <h2>{detailDrawer.title}</h2>
          {detailDrawer.tabs.map((tab) => (
            <section key={tab.key} aria-label={tab.label}>
              {tab.content}
            </section>
          ))}
          <button type="button" onClick={onClose}>Close holding review</button>
        </aside>
      ) : null,
  }),
);

describe("PortfolioRecordScreenClient allocation flow", () => {
  it("connects direct exposure selection to contributing holdings and clears it", () => {
    render(
      <PortfolioRecordScreenClient
        screen="allocation"
        portfolioId="PB_SG_GLOBAL_BAL_001"
        workspace={buildWorkspace()}
      />,
    );

    expect(screen.getByText("Exposure contributors")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Booked holdings" })).toBeInTheDocument();
    expect(screen.getByText("US Technology Equity")).toBeInTheDocument();
    expect(screen.getByText("Singapore Government Bond")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select Technology" }));

    expect(
      screen.getByRole("heading", { name: "Contributing holdings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sector: Technology")).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 of 3 booked holdings contribute to this direct exposure.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("US Technology Equity")).toBeInTheDocument();
    expect(screen.queryByText("Singapore Government Bond")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear exposure" }));

    expect(screen.getByRole("heading", { name: "Booked holdings" })).toBeInTheDocument();
    expect(screen.getByText("Singapore Government Bond")).toBeInTheDocument();
  });

  it("renders source cash balances as direct cash contributors", () => {
    render(
      <PortfolioRecordScreenClient
        screen="allocation"
        portfolioId="PB_SG_GLOBAL_BAL_001"
        workspace={buildWorkspace()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Cash" }));

    expect(screen.getByText("Asset Class: Cash")).toBeInTheDocument();
    expect(screen.getByText("USD Operating Cash")).toBeInTheDocument();
    expect(screen.queryByText("US Technology Equity")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "1 of 3 booked holdings contribute to this direct exposure.",
      ),
    ).toBeInTheDocument();
  });

  it("resets allocation review state when the portfolio identity changes", () => {
    const { rerender } = render(
      <PortfolioRecordScreenClient
        screen="allocation"
        portfolioId="PB_SG_GLOBAL_BAL_001"
        workspace={buildWorkspace()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Technology" }));
    expect(screen.getByText("Sector: Technology")).toBeInTheDocument();

    const nextWorkspace = buildWorkspace();
    nextWorkspace.portfolio.portfolio_id = "PB_SG_INCOME_002";
    nextWorkspace.portfolio.display_name = "Income Mandate";
    rerender(
      <PortfolioRecordScreenClient
        screen="allocation"
        portfolioId="PB_SG_INCOME_002"
        workspace={nextWorkspace}
      />,
    );

    expect(screen.getByRole("heading", { name: "Booked holdings" })).toBeInTheDocument();
    expect(screen.queryByText("Sector: Technology")).not.toBeInTheDocument();
    expect(screen.getByText("US Technology Equity")).toBeInTheDocument();
    expect(screen.getByText("Singapore Government Bond")).toBeInTheDocument();
  });

  it("keeps booked holdings distinct from unavailable expanded contributors", () => {
    render(
      <PortfolioRecordScreenClient
        screen="allocation"
        portfolioId="PB_SG_GLOBAL_BAL_001"
        workspace={buildWorkspace()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Technology" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Use expanded exposure" }),
    );

    expect(screen.getByRole("heading", { name: "Booked holdings" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Booked holdings are shown for reference. Expanded exposure contributors require source-backed look-through detail.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sector: Technology")).not.toBeInTheDocument();
    expect(screen.getByText("US Technology Equity")).toBeInTheDocument();
    expect(screen.getByText("Singapore Government Bond")).toBeInTheDocument();
  });
});

describe("PortfolioRecordScreenClient positions flow", () => {
  it("shows point-in-time book composition and opens source-backed holding activity", () => {
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
      <PortfolioRecordScreenClient
        screen="positions"
        portfolioId="PB_SG_GLOBAL_BAL_001"
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

    expect(screen.getByRole("complementary", { name: "Holding review drawer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "US Technology Equity" })).toBeInTheDocument();
    expect(screen.getByLabelText("Recent Activity")).toHaveTextContent(
      "Recent booked activity supplied with the portfolio review as of 10 Apr 2026",
    );
    expect(screen.getByText("US_TECH · 100 USD gross")).toBeInTheDocument();
    expect(screen.queryByText("SG_BOND · 200 SGD")).not.toBeInTheDocument();
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
      <PortfolioRecordScreenClient
        screen="positions"
        portfolioId="PB_SG_GLOBAL_BAL_001"
        workspace={workspace}
      />,
    );

    expect(screen.getByText("Holdings review partially available")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Cash-balance detail and recent holding activity are temporarily unavailable. Available source records remain visible.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Available holdings" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review USD Operating Cash" })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Review US Technology Equity" }),
    );
    expect(screen.getByLabelText("Recent Activity")).toHaveTextContent(
      "We could not load recent booked activity for this holding.",
    );
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
