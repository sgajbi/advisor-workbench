"use client";

import { useMemo, useState } from "react";

import type {
  PortfolioTransactionDrilldownFilter,
  PortfolioWorkspace,
} from "../types";
import { buildTransactionDrawer } from "./portfolio-record-drawer-builders";
import PortfolioDetailDrawerController from "./portfolio-detail-drawer-controller";
import PortfolioTransactionsGrid, {
  type TransactionRow,
} from "./portfolio-transactions-grid";

export default function PortfolioTransactionsRecordWorkspace({
  workspace,
  asOfDate,
  defaultStartDate,
  defaultEndDate,
}: {
  workspace: PortfolioWorkspace;
  asOfDate: string;
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionRow | null>(null);
  const [externalFilter, setExternalFilter] =
    useState<PortfolioTransactionDrilldownFilter | null>(null);

  const detailDrawer = useMemo(() => {
    if (!selectedTransaction) {
      return null;
    }

    const openDrilldown = (filter: PortfolioTransactionDrilldownFilter) => () => {
      setExternalFilter(filter);
      setSelectedTransaction(null);
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
      },
    );
  }, [selectedTransaction, workspace]);

  return (
    <>
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
        onRowSelect={setSelectedTransaction}
      />
      <PortfolioDetailDrawerController
        detailDrawer={detailDrawer}
        onClose={() => setSelectedTransaction(null)}
      />
    </>
  );
}
