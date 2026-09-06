"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Button from "@mui/material/Button";

import type {
  PortfolioTransactionDrilldownFilter,
  PortfolioWorkspace,
} from "../types";
import { getPortfolioTransactionRecord } from "../api";
import { portfolioQueryKeys } from "../portfolio-query-keys";
import { PortfolioTransactionRecordError } from "../portfolio-transaction-record";
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
  reportingCurrency,
}: {
  workspace: PortfolioWorkspace;
  asOfDate: string;
  defaultStartDate: string;
  defaultEndDate: string;
  initialSelectedRecordId?: string;
  reportingCurrency: string;
}) {
  const [selectedTransactionRecord, setSelectedTransactionRecord] =
    useState<TransactionRow | null>(null);
  const [externalFilter, setExternalFilter] =
    useState<PortfolioTransactionDrilldownFilter | null>(null);
  const focusReturnTransactionIdRef = useRef<string | null>(null);
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
  const localTransaction =
    selectedTransactionRecord?.transactionId === selectedRecordId
      ? selectedTransactionRecord
      : (initialTransactionRows.find(
          (transaction) => transaction.transactionId === selectedRecordId,
        ) ?? null);
  const exactRecordQuery = useQuery({
    queryKey: portfolioQueryKeys.transactionRecord(
      workspace.portfolio.portfolio_id,
      selectedRecordId ?? "unselected",
      asOfDate,
      reportingCurrency,
    ),
    queryFn: ({ signal }) =>
      getPortfolioTransactionRecord(
        workspace.portfolio.portfolio_id,
        selectedRecordId!,
        { asOfDate, reportingCurrency, signal },
      ),
    enabled: Boolean(selectedRecordId && !localTransaction),
    retry: false,
  });
  const exactTransactionRow = useMemo(() => {
    const transaction = exactRecordQuery.data?.transaction;
    return transaction
      ? (buildTransactionRows(
          [transaction],
          workspace.portfolio.base_currency,
        )[0] ?? null)
      : null;
  }, [exactRecordQuery.data?.transaction, workspace.portfolio.base_currency]);
  const selectedTransaction = localTransaction ?? exactTransactionRow;

  const handleTransactionSelect = useCallback(
    (transaction: TransactionRow) => {
      focusReturnTransactionIdRef.current = transaction.transactionId;
      setSelectedTransactionRecord(transaction);
      openRecord(transaction.transactionId);
    },
    [openRecord],
  );

  const handleCloseRecord = useCallback(() => {
    setSelectedTransactionRecord(null);
    closeRecord();
    const transactionId = focusReturnTransactionIdRef.current;
    window.setTimeout(() => {
      for (const candidate of document.querySelectorAll<HTMLElement>(
        "[data-transaction-review-id]",
      )) {
        if (candidate.dataset.transactionReviewId === transactionId) {
          candidate.focus();
          return;
        }
      }
    }, 300);
  }, [closeRecord]);

  const detailDrawer = useMemo(() => {
    if (!selectedTransaction) {
      return null;
    }

    const openDrilldown =
      (filter: PortfolioTransactionDrilldownFilter) => () => {
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
      {selectedRecordId &&
      !selectedTransaction &&
      exactRecordQuery.isPending ? (
        <PortfolioModuleState
          variant="loading"
          title="Opening transaction"
          message="Confirming the exact booked event for this portfolio and review context."
          rows={2}
        />
      ) : null}
      {selectedRecordId && !selectedTransaction && exactRecordQuery.isError ? (
        <PortfolioModuleState
          variant="status"
          state="error"
          {...transactionRecordFailureCopy(exactRecordQuery.error)}
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

function transactionRecordFailureCopy(error: Error): {
  title: string;
  body: string;
} {
  const failure =
    error instanceof PortfolioTransactionRecordError
      ? error.failure
      : "unavailable";
  switch (failure) {
    case "not_found":
      return {
        title: "Transaction no longer available",
        body: "The source ledger did not return this transaction for the selected portfolio and review context. No alternative booking was opened.",
      };
    case "access_denied":
      return {
        title: "Transaction access restricted",
        body: "Your current portfolio access does not permit this booked event to be reviewed. The surrounding ledger remains available.",
      };
    case "invalid_request":
      return {
        title: "Transaction review could not be validated",
        body: "The selected portfolio, date, currency, or transaction identity was not accepted by the source. No substitute evidence was displayed.",
      };
    case "identity_mismatch":
      return {
        title: "Transaction identity could not be confirmed",
        body: "The source response did not match the transaction in this address. No mismatched booking was displayed.",
      };
    case "source_contract_invalid":
      return {
        title: "Transaction evidence could not be verified",
        body: "The source returned an incomplete or inconsistent transaction record. The unverified booking was not displayed.",
      };
    case "source_unavailable":
      return {
        title: "Transaction source temporarily unavailable",
        body: "The exact booked event could not be retrieved. The surrounding ledger remains available for review.",
      };
    case "unavailable":
      return {
        title: "Transaction unavailable",
        body: "The exact booked event could not be confirmed. No alternative booking was opened.",
      };
  }
}
