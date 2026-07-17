import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  buildHoldingDrawer,
  buildTransactionDrawer,
} from "../../src/apps/portfolio/components/portfolio-record-drawer-builders";
import type { HoldingsRow } from "../../src/apps/portfolio/components/portfolio-holdings-grid";
import type { TransactionRow } from "../../src/apps/portfolio/components/portfolio-transactions-grid";

const holdingRow: HoldingsRow = {
  securityId: "EQ_1",
  instrument: "Apple Inc.",
  assetClass: "Equities",
  quantity: 120,
  marketValue: 250000,
  costBasis: 200000,
  weight: 20,
  currency: "USD",
  price: 180,
  heldSince: "2024-01-15",
  upl: 50000,
  sector: "Technology",
  isin: "US0378331005",
  raw: {
    security_id: "EQ_1",
    instrument_name: "Apple Inc.",
    asset_class: "Equities",
    quantity: 120,
    market_value_base: 250000,
    weight_pct: 20,
  },
};

describe("portfolio record drawer builders", () => {
  it("shows a loading related-transactions state for holdings", () => {
    const drawer = buildHoldingDrawer(holdingRow, "PORT_UI_1001", "USD", {
      state: "loading",
    });

    render(<div>{drawer.tabs.find((tab) => tab.key === "related-transactions")?.content}</div>);

    expect(
      screen.getByText("Loading the latest related transactions for this holding.")
    ).toBeInTheDocument();
  });

  it("renders source-backed holding transactions when the ledger fetch succeeds", () => {
    const drawer = buildHoldingDrawer(holdingRow, "PORT_UI_1001", "USD", {
      state: "ready",
      transactions: [
        {
          transaction_id: "TX_1",
          transaction_date: "2026-03-20T00:00:00Z",
          settlement_date: "2026-03-24",
          transaction_type: "BUY",
          security_id: "EQ_1",
          instrument_id: "AAPL",
          quantity: 50,
          currency: "USD",
          gross_amount: 9000,
        },
      ],
    });

    render(<div>{drawer.tabs.find((tab) => tab.key === "related-transactions")?.content}</div>);

    expect(screen.getByText("20 Mar 2026 Buy")).toBeInTheDocument();
    expect(screen.getByText("AAPL · 9,000 USD gross")).toBeInTheDocument();
  });

  it("shows a truthful error state when related holding transactions cannot be loaded", () => {
    const drawer = buildHoldingDrawer(holdingRow, "PORT_UI_1001", "USD", {
      state: "error",
    });

    render(<div>{drawer.tabs.find((tab) => tab.key === "related-transactions")?.content}</div>);

    expect(
      screen.getByText("We could not load recent booked activity for this holding.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Retry from the holdings grid or open the transactions workspace for broader ledger review."
      )
    ).toBeInTheDocument();
  });

  it("preserves linked-event and fx identifiers in the transaction drawer", () => {
    const onOpenLinkedTransactionGroup = vi.fn();
    const onOpenFxContract = vi.fn();
    const onOpenSwapEvent = vi.fn();
    const onOpenNearLegGroup = vi.fn();
    const onOpenFarLegGroup = vi.fn();
    const transactionRow: TransactionRow = {
      transactionId: "TX_1",
      tradeDate: "2026-03-20T00:00:00Z",
      settleDate: "2026-03-24",
      type: "Buy",
      instrument: "AAPL",
      securityId: "EQ_1",
      quantity: 50,
      price: 180,
      grossAmount: 8500,
      transactionCurrency: "EUR",
      netCostBase: 9000,
      realizedGainLossBase: 120,
      priceCurrency: "EUR",
      status: "Settled",
      componentType: "Trade",
      sourceSystem: "Core",
      raw: {
        transaction_id: "TX_1",
        transaction_date: "2026-03-20T00:00:00Z",
        settlement_date: "2026-03-24",
        transaction_type: "BUY",
        component_type: "TRADE",
        security_id: "EQ_1",
        instrument_id: "AAPL",
        quantity: 50,
        gross_amount: 8500,
        net_cost_base: 9000,
        realized_gain_loss_base: 120,
        currency: "EUR",
        economic_event_id: "ECON-2026-0001",
        linked_transaction_group_id: "LTG-FX-2026-0001",
        fx_contract_id: "FXC-2026-0001",
        swap_event_id: "FXSWAP-2026-0001",
        near_leg_group_id: "FXSWAP-2026-0001-NEAR",
        far_leg_group_id: "FXSWAP-2026-0001-FAR",
      },
    };

    const drawer = buildTransactionDrawer(transactionRow, "PORT_UI_1001", "USD", {
      onOpenLinkedTransactionGroup,
      onOpenFxContract,
      onOpenSwapEvent,
      onOpenNearLegGroup,
      onOpenFarLegGroup,
    });

    render(
      <div>
        {drawer.tabs.find((tab) => tab.key === "overview")?.content}
        {drawer.tabs.find((tab) => tab.key === "lifecycle")?.content}
        {drawer.tabs.find((tab) => tab.key === "related-activity")?.content}
        {drawer.tabs.find((tab) => tab.key === "fx-contract")?.content}
        {drawer.tabs.find((tab) => tab.key === "swap-event")?.content}
        {drawer.tabs.find((tab) => tab.key === "near-leg-group")?.content}
        {drawer.tabs.find((tab) => tab.key === "far-leg-group")?.content}
      </div>
    );

    expect(screen.getByText("ECON-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("LTG-FX-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("FXC-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("FXSWAP-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("FXSWAP-2026-0001-NEAR")).toBeInTheDocument();
    expect(screen.getByText("FXSWAP-2026-0001-FAR")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Related Group Transactions" }));
    expect(onOpenLinkedTransactionGroup).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Open FX Contract Transactions" }));
    expect(onOpenFxContract).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Open Swap Event Transactions" }));
    expect(onOpenSwapEvent).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Open Near-Leg Transactions" }));
    expect(onOpenNearLegGroup).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Open Far-Leg Transactions" }));
    expect(onOpenFarLegGroup).toHaveBeenCalledTimes(1);
  });
});
