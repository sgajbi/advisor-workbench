"use client";

import { useMemo, useState } from "react";

import { formatDate } from "../formatters";
import {
  buildBookedHoldingsInventory,
  filterRecentTransactionsForHolding,
} from "../portfolio-booked-holdings-view-model";
import type { PortfolioWorkspace } from "../types";
import { buildHoldingDrawer } from "./portfolio-detail-drawer-builders";
import PortfolioDetailDrawerController from "./portfolio-detail-drawer-controller";
import PortfolioHoldingsGrid, { type HoldingsRow } from "./portfolio-holdings-grid";

export default function PortfolioPositionsRecordWorkspace({
  workspace,
  asOfDate,
}: {
  workspace: PortfolioWorkspace;
  asOfDate: string;
}) {
  const [selectedHolding, setSelectedHolding] = useState<HoldingsRow | null>(null);
  const bookedHoldings = useMemo(
    () =>
      buildBookedHoldingsInventory(
        workspace.positions,
        workspace.cash_balances ?? [],
      ),
    [workspace.cash_balances, workspace.positions],
  );
  const detailDrawer = useMemo(() => {
    if (!selectedHolding) {
      return null;
    }

    return buildHoldingDrawer(
      selectedHolding,
      workspace.portfolio.portfolio_id,
      workspace.portfolio.base_currency,
      {
        state: "ready",
        asOfDate,
        transactions: filterRecentTransactionsForHolding(
          workspace.recent_transactions,
          selectedHolding.securityId,
        ),
      },
    );
  }, [asOfDate, selectedHolding, workspace]);

  return (
    <>
      <PortfolioHoldingsGrid
        portfolioId={workspace.portfolio.portfolio_id}
        positions={bookedHoldings}
        baseCurrency={workspace.portfolio.base_currency}
        asOfDate={asOfDate}
        columnMode="expanded"
        kicker="Position inventory"
        title="Booked holdings"
        description={
          `Complete securities and cash inventory as of ${formatDate(asOfDate)} in ` +
          `${workspace.portfolio.base_currency}. Select a holding to review valuation and recent activity.`
        }
        onRowSelect={setSelectedHolding}
      />
      <PortfolioDetailDrawerController
        detailDrawer={detailDrawer}
        onClose={() => setSelectedHolding(null)}
      />
    </>
  );
}
