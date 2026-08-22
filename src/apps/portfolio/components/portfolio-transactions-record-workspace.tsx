"use client";

import { useCallback, useMemo, useState } from "react";

import Button from "@mui/material/Button";

import type {
  PortfolioTransactionDrilldownFilter,
  PortfolioWorkspace,
} from "../types";
import { buildTransactionDrawer } from "./portfolio-record-drawer-builders";
import PortfolioDetailDrawerController from "./portfolio-detail-drawer-controller";
import PortfolioTransactionsGrid, {
  type TransactionRow,
} from "./portfolio-transactions-grid";
import { buildTransactionRows } from "./portfolio-transactions-grid-helpers";
import PortfolioModuleState from "./portfolio-module-state";
import { usePortfolioRecordSelection } from "./use-portfolio-record-selection";

export default function PortfolioTransactionsRecordWorkspace({
  workspace,
  asOfDate,
  defaultStartDate,
  defaultEndDate,
  initialSelectedRecordId,
}: {
  workspace: PortfolioWorkspace;
  asOfDate: string;
  defaultStartDate: string;
  defaultEndDate: string;
  initialSelectedRecordId?: string;
}) {
  const [selectedTransactionRecord, setSelectedTransactionRecord] =
    useState<TransactionRow | null>(null);
  const [externalFilter, setExternalFilter] =
    useState<PortfolioTransactionDrilldownFilter | null>(null);
  const { selectedRecordId, listHref, openRecord, closeRecord } =
    usePortfolioRecordSelection({
      portfolioId: workspace.portfolio.portfolio_id,
      initialSelectedRecordId,
    });
  const initialTransactionRows = useMemo(
    () =>
      buildTransactionRows(
        workspace.recent_transactions,
        workspace.portfolio.base_currency,
      ),
    [workspace.portfolio.base_currency, workspace.recent_transactions],
  );
  const selectedTransaction =
    selectedTransactionRecord?.transactionId === selectedRecordId
      ? selectedTransactionRecord
      : (initialTransactionRows.find(
          (transaction) => transaction.transactionId === selectedRecordId,
        ) ?? null);

  const handleTransactionSelect = useCallback(
    (transaction: TransactionRow) => {
      setSelectedTransactionRecord(transaction);
      openRecord(transaction.transactionId);
    },
    [openRecord],
  );

  const handleCloseRecord = useCallback(() => {
    setSelectedTransactionRecord(null);
    closeRecord();
  }, [closeRecord]);

  const detailDrawer = useMemo(() => {
    if (!selectedTransaction) {
      return null;
    }

    const openDrilldown = (filter: PortfolioTransactionDrilldownFilter) => () => {
      setExternalFilter(filter);
      handleCloseRecord();
    };
    const raw = selectedTransaction.raw;

    return buildTransactionDrawer(
      selectedTransaction,
      workspace.portfolio.portfolio_id,
      workspace.portfolio.base_currency,
      {
        onOpenLinkedTransactionGroup: raw.linked_transaction_group_id
          ? openDrilldown({
              kind: "linked_group",
              linked_transaction_group_id: raw.linked_transaction_group_id,
              label: `Related booking group ${raw.linked_transaction_group_id}`,
            })
          : null,
        onOpenFxContract: raw.fx_contract_id
          ? openDrilldown({
              kind: "fx_contract",
              fx_contract_id: raw.fx_contract_id,
              label: `FX contract ${raw.fx_contract_id}`,
            })
          : null,
        onOpenSwapEvent: raw.swap_event_id
          ? openDrilldown({
              kind: "swap_event",
              swap_event_id: raw.swap_event_id,
              label: `Swap event ${raw.swap_event_id}`,
            })
          : null,
        onOpenNearLegGroup: raw.near_leg_group_id
          ? openDrilldown({
              kind: "near_leg_group",
              near_leg_group_id: raw.near_leg_group_id,
              label: `Near-leg booking group ${raw.near_leg_group_id}`,
            })
          : null,
        onOpenFarLegGroup: raw.far_leg_group_id
          ? openDrilldown({
              kind: "far_leg_group",
              far_leg_group_id: raw.far_leg_group_id,
              label: `Far-leg booking group ${raw.far_leg_group_id}`,
            })
          : null,
        fullPageHref: listHref ?? undefined,
      },
    );
  }, [handleCloseRecord, listHref, selectedTransaction, workspace]);

  return (
    <>
      {selectedRecordId && !selectedTransaction ? (
        <PortfolioModuleState
          variant="status"
          state="error"
          title="Transaction is not in the loaded activity page"
          body="The requested transaction identity was not returned in the current source page for this portfolio and review period. No alternative booking was opened."
          action={
            <Button size="small" variant="outlined" onClick={handleCloseRecord}>
              Clear transaction review
            </Button>
          }
        />
      ) : null}
      <PortfolioTransactionsGrid
        portfolioId={workspace.portfolio.portfolio_id}
        baseCurrency={workspace.portfolio.base_currency}
        asOfDate={asOfDate}
        defaultStartDate={defaultStartDate}
        defaultEndDate={defaultEndDate}
        initialTransactions={workspace.recent_transactions}
        initialLedgerPage={workspace.transaction_ledger_page}
        externalFilter={externalFilter}
        onClearExternalFilter={() => setExternalFilter(null)}
        onRowSelect={handleTransactionSelect}
      />
      <PortfolioDetailDrawerController
        detailDrawer={detailDrawer}
        onClose={handleCloseRecord}
      />
    </>
  );
}
