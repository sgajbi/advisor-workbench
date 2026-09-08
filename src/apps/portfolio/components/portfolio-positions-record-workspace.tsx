"use client";

import { useCallback, useMemo } from "react";

import Button from "@mui/material/Button";

import { formatDate } from "../formatters";
import {
  buildBookedHoldingsInventory,
  buildPositionsReviewAvailability,
  filterRecentTransactionsForHolding,
} from "../portfolio-booked-holdings-view-model";
import { PORTFOLIO_MODULE_LABELS } from "../portfolio-terminology";
import type { PortfolioWorkspace } from "../types";
import type { PortfolioTimeWindow } from "../view-model";
import { buildHoldingDrawer } from "./portfolio-detail-drawer-builders";
import PortfolioDetailDrawerController from "./portfolio-detail-drawer-controller";
import PortfolioHoldingsGrid from "./portfolio-holdings-grid";
import { buildHoldingRow } from "./portfolio-holdings-grid-helpers";
import PortfolioModuleState from "./portfolio-module-state";
import { usePortfolioRecordSelection } from "./use-portfolio-record-selection";

export default function PortfolioPositionsRecordWorkspace({
  workspace,
  asOfDate,
  timeWindow,
  reportingCurrency,
}: {
  workspace: PortfolioWorkspace;
  asOfDate: string;
  timeWindow: PortfolioTimeWindow;
  reportingCurrency: string;
}) {
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
  const { selectedRecordId, buildRelatedHref, openRecord, closeRecord } =
    usePortfolioRecordSelection({
      portfolioId: workspace.portfolio.portfolio_id,
    });
  const selectedHolding = useMemo(
    () => {
      const holding = bookedHoldings.find(
        (candidate) => candidate.security_id === selectedRecordId,
      );
      return holding
        ? buildHoldingRow(holding, workspace.portfolio.base_currency)
        : null;
    },
    [bookedHoldings, selectedRecordId, workspace.portfolio.base_currency],
  );
  const handleHoldingSelect = useCallback(
    (holding: { securityId: string }) => openRecord(holding.securityId),
    [openRecord],
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
      { fullPageHref: buildRelatedHref("/transactions") ?? undefined },
    );
  }, [
    asOfDate,
    availability.activityAvailable,
    buildRelatedHref,
    selectedHolding,
    workspace,
  ]);

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
      {selectedRecordId && !selectedHolding ? (
        <PortfolioModuleState
          variant="status"
          state="error"
          title="Position is not in this confirmed portfolio view"
          body="The requested position identity was not returned for the selected portfolio and valuation date. No alternative position was opened."
          action={
            <Button size="small" variant="outlined" onClick={closeRecord}>
              Clear position review
            </Button>
          }
        />
      ) : null}
      <PortfolioHoldingsGrid
        reviewContext={{
          portfolioId: workspace.portfolio.portfolio_id,
          asOfDate,
          period: timeWindow,
          reportingCurrency,
        }}
        positions={bookedHoldings}
        baseCurrency={workspace.portfolio.base_currency}
        columnMode="expanded"
        kicker="Booked records"
        title={PORTFOLIO_MODULE_LABELS.bookedPortfolioInventory}
        description={
          availability.inventoryComplete
            ? `Complete securities and cash inventory as of ${formatDate(asOfDate)} in ` +
              `${workspace.portfolio.base_currency}. Select a position to review valuation and recent activity.`
            : `Available booked records as of ${formatDate(asOfDate)} in ` +
              `${workspace.portfolio.base_currency}. The inventory remains partial until unavailable detail is restored.`
        }
        onRowSelect={handleHoldingSelect}
      />
      <PortfolioDetailDrawerController
        detailDrawer={detailDrawer}
        onClose={closeRecord}
      />
    </>
  );
}
