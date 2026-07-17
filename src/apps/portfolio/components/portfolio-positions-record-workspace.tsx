"use client";

import { useMemo, useState } from "react";

import { formatDate } from "../formatters";
import {
  buildBookedHoldingsInventory,
  buildPositionsReviewAvailability,
  filterRecentTransactionsForHolding,
} from "../portfolio-booked-holdings-view-model";
import type { PortfolioWorkspace } from "../types";
import { buildHoldingDrawer } from "./portfolio-detail-drawer-builders";
import PortfolioDetailDrawerController from "./portfolio-detail-drawer-controller";
import PortfolioHoldingsGrid, { type HoldingsRow } from "./portfolio-holdings-grid";
import PortfolioModuleState from "./portfolio-module-state";

export default function PortfolioPositionsRecordWorkspace({
  workspace,
  asOfDate,
}: {
  workspace: PortfolioWorkspace;
  asOfDate: string;
}) {
  const [selectedHolding, setSelectedHolding] = useState<HoldingsRow | null>(null);
  const availability = buildPositionsReviewAvailability(
    workspace.record_data_availability,
  );
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
      availability.activityAvailable
        ? {
            state: "ready",
            asOfDate,
            transactions: filterRecentTransactionsForHolding(
              workspace.recent_transactions,
              selectedHolding.securityId,
            ),
          }
        : { state: "error" },
    );
  }, [asOfDate, availability.activityAvailable, selectedHolding, workspace]);

  return (
    <>
      {availability.partialState ? (
        <PortfolioModuleState
          variant="status"
          state="partial"
          title={availability.partialState.title}
          body={availability.partialState.body}
          hint={availability.partialState.hint}
        />
      ) : null}
      <PortfolioHoldingsGrid
        portfolioId={workspace.portfolio.portfolio_id}
        positions={bookedHoldings}
        baseCurrency={workspace.portfolio.base_currency}
        asOfDate={asOfDate}
        columnMode="expanded"
        kicker="Position inventory"
        title={availability.inventoryComplete ? "Booked holdings" : "Available holdings"}
        description={
          availability.inventoryComplete
            ? `Complete securities and cash inventory as of ${formatDate(asOfDate)} in ` +
              `${workspace.portfolio.base_currency}. Select a holding to review valuation and recent activity.`
            : `Available booked records as of ${formatDate(asOfDate)} in ` +
              `${workspace.portfolio.base_currency}. The inventory remains partial until unavailable detail is restored.`
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
