import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  PortfolioAllocationSelection,
  PortfolioPositionView,
  PortfolioWorkspace,
} from "../../src/apps/portfolio/types";
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
    }: {
      positions: PortfolioPositionView[];
      kicker?: string;
      title?: string;
      description?: string;
      filterLabel?: string | null;
      onClearFilter?: () => void;
    }) => (
      <section aria-label="Holdings breakdown">
        <span>{kicker}</span>
        <h2>{title}</h2>
        <p>{description}</p>
        {filterLabel ? <strong>{filterLabel}</strong> : null}
        {positions.map((position) => (
          <div key={position.security_id}>{position.instrument_name}</div>
        ))}
        {filterLabel ? (
          <button type="button" onClick={onClearFilter}>
            Clear exposure
          </button>
        ) : null}
      </section>
    ),
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
        "1 of 2 booked positions contribute to this direct exposure.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("US Technology Equity")).toBeInTheDocument();
    expect(screen.queryByText("Singapore Government Bond")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear exposure" }));

    expect(screen.getByRole("heading", { name: "Booked holdings" })).toBeInTheDocument();
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
    cash_balances: [],
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
