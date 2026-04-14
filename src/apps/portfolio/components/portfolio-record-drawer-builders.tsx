"use client";

import {
  formatCurrency,
  formatDate,
  formatPct,
  formatQuantity,
  formatStatus,
} from "../formatters";
import type { PortfolioTransactionDrilldownFilter, PortfolioWorkspace } from "../types";
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
  relatedTransactions: PortfolioWorkspace["recent_transactions"]
): PortfolioDetailDrawerState {
  return {
    kicker: "Holding Detail",
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
        label: "Related Transactions",
        content: relatedTransactions.length
          ? renderDrawerDefinitionList(
              relatedTransactions.slice(0, 6).map((transaction) => [
                `${formatDate(transaction.transaction_date)} ${formatStatus(
                  transaction.transaction_type
                )}`,
                formatCurrency(
                  transaction.net_cost_base ?? transaction.gross_amount,
                  transaction.currency ?? baseCurrency
                ),
              ])
            )
          : renderDrawerParagraphs([
              "No related transactions are available in the current ledger window for this holding.",
            ]),
      },
    ],
    fullPageHref: `/portfolio?portfolioId=${encodeURIComponent(
      portfolioId
    )}#portfolio-drilldown`,
    fullPageLabel: "Open holdings",
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
                `${transaction.instrument_id} · ${formatCurrency(
                  transaction.net_cost_base ?? transaction.gross_amount,
                  transaction.currency ?? baseCurrency
                )}`,
              ])
            )
          : renderDrawerParagraphs([
              "No transactions in the current ledger window match this drill-down.",
            ]),
      },
    ],
    fullPageHref: "#portfolio-drilldown",
    fullPageLabel: "Open transactions",
  };
}

export function buildTransactionDrawer(
  row: TransactionRow,
  portfolioId: string,
  baseCurrency: string
): PortfolioDetailDrawerState {
  return {
    kicker: "Transaction Detail",
    title: row.type,
    subtitle: row.instrument,
    summaryItems: [
      { label: "Amount", value: formatCurrency(row.amount, row.currency) },
      { label: "Status", value: formatStatus(row.status) },
      { label: "Trade Date", value: formatDate(row.tradeDate) },
    ],
    tabs: [
      {
        key: "overview",
        label: "Overview",
        content: renderDrawerDefinitionList([
          ["Transaction ID", row.transactionId],
          ["Type", row.type],
          ["Instrument", row.instrument],
          ["Quantity", formatQuantity(row.quantity)],
          ["Amount", formatCurrency(row.amount, row.currency)],
        ]),
      },
      {
        key: "lifecycle",
        label: "Lifecycle",
        content: renderDrawerDefinitionList([
          ["Trade Date", formatDate(row.tradeDate)],
          ["Status", formatStatus(row.status)],
          [
            "Component Type",
            row.componentType ? formatStatus(row.componentType) : "N/A",
          ],
          ["Settlement Date", "Not exposed by the current source contract"],
          ["Base Amount", formatCurrency(row.amount, baseCurrency)],
        ]),
      },
    ],
    fullPageHref: `/portfolio?portfolioId=${encodeURIComponent(
      portfolioId
    )}#portfolio-drilldown`,
    fullPageLabel: "Open transactions",
  };
}

function formatActivityBucketLabel(value: string): string {
  return formatDrawerLabel(value.toLowerCase());
}
