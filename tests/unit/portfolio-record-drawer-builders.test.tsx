import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildHoldingDrawer } from "../../src/apps/portfolio/components/portfolio-record-drawer-builders";
import type { HoldingsRow } from "../../src/apps/portfolio/components/portfolio-holdings-grid";

const holdingRow: HoldingsRow = {
  securityId: "EQ_1",
  instrument: "Apple Inc.",
  assetClass: "Equities",
  quantity: 120,
  marketValue: 250000,
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
    expect(screen.getByText("AAPL · 9,000 USD")).toBeInTheDocument();
  });

  it("shows a truthful error state when related holding transactions cannot be loaded", () => {
    const drawer = buildHoldingDrawer(holdingRow, "PORT_UI_1001", "USD", {
      state: "error",
    });

    render(<div>{drawer.tabs.find((tab) => tab.key === "related-transactions")?.content}</div>);

    expect(
      screen.getByText("We could not load related transactions for this holding.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Retry from the holdings grid or open the transactions workspace for broader ledger review."
      )
    ).toBeInTheDocument();
  });
});
