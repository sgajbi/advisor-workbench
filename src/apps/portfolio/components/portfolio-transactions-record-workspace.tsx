"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ActionButton, SourceRefreshAction } from "@/design-system";
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
  const [focusReturnTransactionId, setFocusReturnTransactionId] = useState<
    string | null
  >(null);
  const [focusReturnRequest, setFocusReturnRequest] = useState<{
    transactionId: string;
  } | null>(null);
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
    gcTime: Infinity,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
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

  useEffect(() => {
    if (!focusReturnRequest) {
      return;
    }
    const timer = window.setTimeout(() => {
      for (const candidate of document.querySelectorAll<HTMLElement>(
        "[data-transaction-review-id]",
      )) {
        if (
          candidate.dataset.transactionReviewId ===
          focusReturnRequest.transactionId
        ) {
          candidate.focus();
          return;
        }
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [focusReturnRequest]);

  const handleTransactionSelect = useCallback(
    (transaction: TransactionRow) => {
      setFocusReturnRequest(null);
      setFocusReturnTransactionId(transaction.transactionId);
      setSelectedTransactionRecord(transaction);
      openRecord(transaction.transactionId);
    },
    [openRecord],
  );

  const handleCloseRecord = useCallback(() => {
    setSelectedTransactionRecord(null);
    closeRecord();
    setFocusReturnRequest(
      focusReturnTransactionId
        ? { transactionId: focusReturnTransactionId }
        : null,
    );
  }, [closeRecord, focusReturnTransactionId]);

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
        <TransactionRecordFailureState
          error={exactRecordQuery.error}
          isRetrying={exactRecordQuery.isFetching}
          onRetry={() => exactRecordQuery.refetch()}
          onClear={handleCloseRecord}
          refreshScope={JSON.stringify(
            portfolioQueryKeys.transactionRecord(
              workspace.portfolio.portfolio_id,
              selectedRecordId,
              asOfDate,
              reportingCurrency,
            ),
          )}
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

function TransactionRecordFailureState({
  error,
  isRetrying,
  onRetry,
  onClear,
  refreshScope,
}: {
  error: Error;
  isRetrying: boolean;
  onRetry: () => Promise<unknown>;
  onClear: () => void;
  refreshScope: string;
}) {
  const failure =
    error instanceof PortfolioTransactionRecordError
      ? error.failure
      : "unavailable";
  const action = (
    <>
      <SourceRefreshAction
        refreshScope={refreshScope}
        idleLabel="Retry transaction"
        busyLabel="Retrying transaction"
        isRefreshing={isRetrying}
        onRefresh={onRetry}
      />
      <ActionButton priority="quiet" onClick={onClear}>
        Clear transaction review
      </ActionButton>
    </>
  );
  switch (failure) {
    case "not_found":
      return (
        <PortfolioModuleState
          variant="status"
          state="error"
          action={action}
          title="Transaction no longer available"
          body="The source ledger did not return this transaction for the selected portfolio and review context. No alternative booking was opened."
        />
      );
    case "access_denied":
      return (
        <PortfolioModuleState
          variant="status"
          state="error"
          action={action}
          title="Transaction access restricted"
          body="Your current portfolio access does not permit this booked event to be reviewed. The surrounding ledger remains available."
        />
      );
    case "invalid_request":
      return (
        <PortfolioModuleState
          variant="status"
          state="error"
          action={action}
          title="Transaction review could not be validated"
          body="The selected portfolio, date, currency, or transaction identity was not accepted by the source. No substitute evidence was displayed."
        />
      );
    case "identity_mismatch":
      return (
        <PortfolioModuleState
          variant="status"
          state="error"
          action={action}
          title="Transaction identity could not be confirmed"
          body="The source response did not match the transaction in this address. No mismatched booking was displayed."
        />
      );
    case "source_contract_invalid":
      return (
        <PortfolioModuleState
          variant="status"
          state="error"
          action={action}
          title="Transaction evidence could not be verified"
          body="The source returned an incomplete or inconsistent transaction record. The unverified booking was not displayed."
        />
      );
    case "source_unavailable":
      return (
        <PortfolioModuleState
          variant="status"
          state="error"
          action={action}
          title="Transaction source temporarily unavailable"
          body="The exact booked event could not be retrieved. The surrounding ledger remains available for review."
        />
      );
    case "unavailable":
      return (
        <PortfolioModuleState
          variant="status"
          state="error"
          action={action}
          title="Transaction unavailable"
          body="The exact booked event could not be confirmed. No alternative booking was opened."
        />
      );
  }
}
