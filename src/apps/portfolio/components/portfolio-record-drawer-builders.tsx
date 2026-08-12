"use client";

import Button from "@mui/material/Button";

import {
  formatCurrency,
  formatDate,
  formatPct,
  formatQuantity,
  formatStatus,
} from "../formatters";
import type {
  PortfolioTransactionDrilldownFilter,
  PortfolioTransactionView,
  PortfolioWorkspace,
} from "../types";
import type { HoldingsRow } from "./portfolio-holdings-grid";
import type { TransactionRow } from "./portfolio-transactions-grid";
import {
  formatDrawerLabel,
  renderDrawerDefinitionList,
  renderDrawerParagraphs,
} from "./portfolio-detail-drawer-shared";
import type { PortfolioDetailDrawerState } from "./portfolio-detail-drawer-types";

export function buildHoldingDrawer(
  row: HoldingsRow,
  portfolioId: string,
  baseCurrency: string,
  relatedTransactionsState:
    | { state: "loading" }
    | { state: "error" }
    | {
        state: "ready";
        asOfDate?: string;
        transactions: PortfolioWorkspace["recent_transactions"];
      }
): PortfolioDetailDrawerState {
  const relatedTransactionsTab = buildHoldingRelatedTransactionsTab(
    relatedTransactionsState,
    baseCurrency
  );

  return {
    kicker: "Holding review",
    title: row.instrument,
    subtitle: row.assetClass,
    summaryItems: [
      { label: "Market Value", value: formatCurrency(row.marketValue, baseCurrency) },
      { label: "Weight", value: formatPct(row.weight) },
      { label: "Currency", value: row.currency },
    ],
    tabs: [
      {
        key: "overview",
        label: "Overview",
        content: renderDrawerDefinitionList([
          ["Security ID", row.securityId],
          ["Quantity", formatQuantity(row.quantity)],
          [
            "Price",
            row.price === null ? "—" : formatCurrency(row.price, row.currency),
          ],
          ["Held Since", formatDate(row.heldSince)],
        ]),
      },
      {
        key: "valuation",
        label: "Valuation",
        content: renderDrawerDefinitionList([
          ["Market Value", formatCurrency(row.marketValue, baseCurrency)],
          ["Unrealized P&L", formatCurrency(row.upl, baseCurrency)],
          ["Weight", formatPct(row.weight)],
          ["Sector", row.sector],
          ["ISIN", row.isin ?? "N/A"],
        ]),
      },
      {
        key: "related-transactions",
        label: "Recent Activity",
        content: relatedTransactionsTab,
      },
    ],
    fullPageHref: `/transactions?portfolioId=${encodeURIComponent(portfolioId)}`,
    fullPageLabel: "Open transactions",
  };
}

export function buildTransactionDrilldownDrawer(
  filter: PortfolioTransactionDrilldownFilter,
  workspace: PortfolioWorkspace,
  transactions: PortfolioWorkspace["recent_transactions"],
  baseCurrency: string
): PortfolioDetailDrawerState {
  return {
    kicker: "Transaction Drill-Down",
    title:
      filter.kind === "activity"
        ? formatActivityBucketLabel(filter.bucket)
        : "Related Transactions",
    subtitle: filter.label,
    summaryItems: [
      { label: "Matches", value: `${transactions.length}` },
      { label: "Portfolio", value: workspace.portfolio.portfolio_id },
      { label: "Window", value: `${formatDate(workspace.as_of_date)}` },
    ],
    tabs: [
      {
        key: "overview",
        label: "Overview",
        content: transactions.length
          ? renderDrawerDefinitionList(
              transactions.slice(0, 8).map((transaction) => [
                `${formatDate(transaction.transaction_date)} ${formatStatus(
                  transaction.transaction_type
                )}`,
                `${transaction.instrument_id} · ${formatBookedTransactionAmount(
                  transaction,
                  baseCurrency,
                )}`,
              ])
            )
          : renderDrawerParagraphs([
              "No transactions in the current ledger window match this drill-down.",
            ]),
      },
    ],
    fullPageHref: `/transactions?portfolioId=${encodeURIComponent(workspace.portfolio.portfolio_id)}`,
    fullPageLabel: "Open transactions",
  };
}

export function buildTransactionDrawer(
  row: TransactionRow,
  portfolioId: string,
  baseCurrency: string,
  actions?: {
    onOpenLinkedTransactionGroup?: (() => void) | null;
    onOpenFxContract?: (() => void) | null;
    onOpenSwapEvent?: (() => void) | null;
    onOpenNearLegGroup?: (() => void) | null;
    onOpenFarLegGroup?: (() => void) | null;
  }
): PortfolioDetailDrawerState {
  const hasLinkedGroupAction =
    Boolean(row.raw.linked_transaction_group_id) && Boolean(actions?.onOpenLinkedTransactionGroup);
  const hasFxContractAction =
    Boolean(row.raw.fx_contract_id) && Boolean(actions?.onOpenFxContract);
  const hasSwapEventAction =
    Boolean(row.raw.swap_event_id) && Boolean(actions?.onOpenSwapEvent);
  const hasNearLegGroupAction =
    Boolean(row.raw.near_leg_group_id) && Boolean(actions?.onOpenNearLegGroup);
  const hasFarLegGroupAction =
    Boolean(row.raw.far_leg_group_id) && Boolean(actions?.onOpenFarLegGroup);

  return {
    kicker: "Transaction Detail",
    title: row.type,
    subtitle: row.instrument,
    summaryItems: [
      {
        label: "Gross Amount",
        value: formatCurrency(row.grossAmount, row.transactionCurrency ?? baseCurrency),
      },
      { label: "Net Cost", value: formatCurrency(row.netCostBase, baseCurrency) },
      { label: "Settlement status", value: row.settlementState.label },
    ],
    tabs: [
      {
        key: "overview",
        label: "Overview",
        content: renderDrawerDefinitionList([
          ["Transaction ID", row.transactionId],
          ["Type", row.type],
          ["Instrument", row.instrument],
          ["Economic Event ID", row.raw.economic_event_id ?? "N/A"],
          ["Linked Transaction Group", row.raw.linked_transaction_group_id ?? "N/A"],
          ["Quantity", formatQuantity(row.quantity)],
          [
            "Gross Amount",
            formatCurrency(row.grossAmount, row.transactionCurrency ?? baseCurrency),
          ],
          ["Transaction Currency", row.transactionCurrency ?? "N/A"],
          ["Net Cost", formatCurrency(row.netCostBase, baseCurrency)],
          ["Realized P&L", formatCurrency(row.realizedGainLossBase, baseCurrency)],
        ]),
      },
      {
        key: "lifecycle",
        label: "Lifecycle",
        content: renderDrawerDefinitionList([
          ["Trade Date", formatDate(row.tradeDate)],
          ["Settlement Date", formatDate(row.settleDate)],
          ["Settlement status", row.settlementState.label],
          [
            "Component Type",
            row.componentType ? formatStatus(row.componentType) : "Not reported",
          ],
          ["FX Contract ID", row.raw.fx_contract_id ?? "N/A"],
          ["Swap Event ID", row.raw.swap_event_id ?? "N/A"],
          ["Near-Leg Group", row.raw.near_leg_group_id ?? "N/A"],
          ["Far-Leg Group", row.raw.far_leg_group_id ?? "N/A"],
          ["Portfolio Currency", baseCurrency],
        ]),
      },
      {
        key: "related-activity",
        label: "Related Activity",
        content: hasLinkedGroupAction ? (
          <div className="portfolio-detail-drawer-action-group">
            <p>
              Review the related transaction group when this booked event spans multiple
              ledger rows.
            </p>
            <Button variant="outlined" size="small" onClick={actions?.onOpenLinkedTransactionGroup ?? undefined}>
              Open Related Group Transactions
            </Button>
          </div>
        ) : renderDrawerParagraphs([
          "No related transaction-group drill-down is available for this booked event.",
        ]),
      },
      {
        key: "fx-contract",
        label: "FX Contract",
        content: hasFxContractAction ? (
          <div className="portfolio-detail-drawer-action-group">
            <p>
              Review all transactions linked to this FX contract when the booked event
              belongs to a contract lifecycle.
            </p>
            <Button variant="outlined" size="small" onClick={actions?.onOpenFxContract ?? undefined}>
              Open FX Contract Transactions
            </Button>
          </div>
        ) : renderDrawerParagraphs([
          "No FX contract drill-down is available for this booked event.",
        ]),
      },
      {
        key: "swap-event",
        label: "Swap Event",
        content: hasSwapEventAction ? (
          <div className="portfolio-detail-drawer-action-group">
            <p>
              Review all transactions tied to this swap event when the booked event belongs
              to a multi-leg swap lifecycle.
            </p>
            <Button variant="outlined" size="small" onClick={actions?.onOpenSwapEvent ?? undefined}>
              Open Swap Event Transactions
            </Button>
          </div>
        ) : renderDrawerParagraphs([
          "No swap-event drill-down is available for this booked event.",
        ]),
      },
      {
        key: "near-leg-group",
        label: "Near-Leg Group",
        content: hasNearLegGroupAction ? (
          <div className="portfolio-detail-drawer-action-group">
            <p>
              Review all transactions tied to this near-leg group when the booked event is
              one side of a multi-leg swap lifecycle.
            </p>
            <Button variant="outlined" size="small" onClick={actions?.onOpenNearLegGroup ?? undefined}>
              Open Near-Leg Transactions
            </Button>
          </div>
        ) : renderDrawerParagraphs([
          "No near-leg drill-down is available for this booked event.",
        ]),
      },
      {
        key: "far-leg-group",
        label: "Far-Leg Group",
        content: hasFarLegGroupAction ? (
          <div className="portfolio-detail-drawer-action-group">
            <p>
              Review all transactions tied to this far-leg group when the booked event is
              one side of a multi-leg swap lifecycle.
            </p>
            <Button variant="outlined" size="small" onClick={actions?.onOpenFarLegGroup ?? undefined}>
              Open Far-Leg Transactions
            </Button>
          </div>
        ) : renderDrawerParagraphs([
          "No far-leg drill-down is available for this booked event.",
        ]),
      },
    ],
    fullPageHref: `/transactions?portfolioId=${encodeURIComponent(portfolioId)}`,
    fullPageLabel: "Open transactions",
  };
}

function formatActivityBucketLabel(value: string): string {
  return formatDrawerLabel(value.toLowerCase());
}

function buildHoldingRelatedTransactionsTab(
  relatedTransactionsState:
    | { state: "loading" }
    | { state: "error" }
    | {
        state: "ready";
        asOfDate?: string;
        transactions: PortfolioWorkspace["recent_transactions"];
      },
  baseCurrency: string
) {
  if (relatedTransactionsState.state === "loading") {
    return renderDrawerParagraphs([
      "Loading the latest related transactions for this holding.",
    ]);
  }

  if (relatedTransactionsState.state === "error") {
    return renderDrawerParagraphs([
      "We could not load recent booked activity for this holding.",
      "Retry from the holdings grid or open the transactions workspace for broader ledger review.",
    ]);
  }

  const lineageNote = relatedTransactionsState.asOfDate
    ? `Recent booked activity supplied with the portfolio review as of ${formatDate(relatedTransactionsState.asOfDate)}. Open Transactions for the full ledger.`
    : "Recent booked activity supplied with the portfolio review. Open Transactions for the full ledger.";

  return (
    <>
      {renderDrawerParagraphs([lineageNote])}
      {relatedTransactionsState.transactions.length
        ? renderDrawerDefinitionList(
            relatedTransactionsState.transactions.slice(0, 6).map((transaction) => [
              `${formatDate(transaction.transaction_date)} ${formatStatus(
                transaction.transaction_type
              )}`,
              `${transaction.instrument_id} · ${formatBookedTransactionAmount(
                transaction,
                baseCurrency,
              )}`,
            ])
          )
        : renderDrawerParagraphs([
            "No recent booked activity was returned for this holding.",
          ])}
    </>
  );
}

function formatBookedTransactionAmount(
  transaction: PortfolioTransactionView,
  baseCurrency: string,
): string {
  if (transaction.net_cost_base != null) {
    return `${formatCurrency(transaction.net_cost_base, baseCurrency)} net cost`;
  }

  if (transaction.gross_amount != null) {
    return `${formatCurrency(
      transaction.gross_amount,
      transaction.currency ?? baseCurrency,
    )} gross`;
  }

  return "Amount N/A";
}
