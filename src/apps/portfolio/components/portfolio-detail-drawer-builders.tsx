"use client";

import type { ReactNode } from "react";

import {
  formatBooleanFlag,
  formatCount,
  formatCurrency,
  formatDate,
  formatPct,
  formatQuantity,
  formatStatus,
} from "../formatters";
import type {
  PortfolioPositionView,
  PortfolioTransactionDrilldownFilter,
  PortfolioWorkspace,
} from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";
import { getInvestedAssetWeight } from "../view-model";
import type { HoldingsRow } from "./portfolio-holdings-grid";
import type { TransactionRow } from "./portfolio-transactions-grid";

export type PortfolioDetailDrawerState = {
  kicker: string;
  title: string;
  subtitle?: string;
  summaryItems: Array<{
    label: string;
    value: string;
  }>;
  tabs: Array<{
    key: string;
    label: string;
    content: ReactNode;
  }>;
  fullPageHref: string;
  fullPageLabel: string;
};

export type PortfolioMetricDrawerKey = "aum" | "invested_assets" | "available_cash";

export function buildMetricDrawer(
  metric: PortfolioMetricDrawerKey,
  workspace: PortfolioWorkspace,
  context: PortfolioWorkspaceContext
): PortfolioDetailDrawerState {
  const commonSummary = [
    { label: "Portfolio", value: workspace.portfolio.portfolio_id },
    { label: "As of", value: formatDate(context.selectedAsOfDate) },
  ];

  switch (metric) {
    case "aum":
      return {
        kicker: "Metric Detail",
        title: "AUM",
        subtitle: "Total market value across invested holdings and operational cash.",
        summaryItems: [
          {
            label: "Value",
            value: formatCurrency(
              workspace.summary.market_value_base,
              workspace.portfolio.base_currency
            ),
          },
          { label: "Base Currency", value: workspace.portfolio.base_currency },
          ...commonSummary,
        ],
        tabs: [
          {
            key: "definition",
            label: "Definition",
            content: renderDrawerParagraphs([
              "Assets under management represents current portfolio market value in base currency.",
              "It combines invested holdings and available cash at the selected page context.",
            ]),
          },
          {
            key: "detail",
            label: "Underlying Detail",
            content: renderDrawerDefinitionList([
              [
                "Invested Assets",
                formatCurrency(
                  workspace.summary.invested_market_value_base,
                  workspace.portfolio.base_currency
                ),
              ],
              [
                "Available Cash",
                formatCurrency(
                  workspace.summary.total_cash_base,
                  workspace.portfolio.base_currency
                ),
              ],
              ["Holdings", String(workspace.summary.position_count)],
              ["Cash Accounts", String(workspace.summary.cash_balance_count ?? 0)],
            ]),
          },
        ],
        fullPageHref: "#portfolio-health",
        fullPageLabel: "Open health snapshot",
      };
    case "invested_assets":
      return {
        kicker: "Metric Detail",
        title: "Invested Assets",
        subtitle: "Value currently deployed into funded positions rather than cash inventory.",
        summaryItems: [
          {
            label: "Value",
            value: formatCurrency(
              workspace.summary.invested_market_value_base,
              workspace.portfolio.base_currency
            ),
          },
          { label: "Weight", value: formatPct(getInvestedAssetWeight(workspace)) },
          ...commonSummary,
        ],
        tabs: [
          {
            key: "definition",
            label: "Definition",
            content: renderDrawerParagraphs([
              "Invested assets indicates how much of the book is currently allocated to positions.",
              "Use it with available cash and allocation views to assess deployment level.",
            ]),
          },
          {
            key: "detail",
            label: "Underlying Detail",
            content: renderDrawerDefinitionList([
              ["Top Holding", workspace.top_positions[0]?.instrument_name ?? "N/A"],
              [
                "Top Holding Weight",
                formatPct(workspace.top_positions[0]?.weight_pct ?? null),
              ],
              ["Allocation Views", String(workspace.allocation_views?.length ?? 0)],
              [
                "Valued Positions",
                String(
                  workspace.positions.filter(
                    (position) => (position.market_value_base ?? 0) > 0
                  ).length
                ),
              ],
            ]),
          },
        ],
        fullPageHref: "#portfolio-insights",
        fullPageLabel: "Open allocation",
      };
    case "available_cash":
      return {
        kicker: "Metric Detail",
        title: "Available Cash",
        subtitle:
          "Published cash inventory available to fund activity and meet liquidity needs.",
        summaryItems: [
          {
            label: "Value",
            value: formatCurrency(
              workspace.summary.total_cash_base,
              workspace.portfolio.base_currency
            ),
          },
          { label: "Cash Allocation", value: formatPct(workspace.summary.cash_weight_pct) },
          ...commonSummary,
        ],
        tabs: [
          {
            key: "definition",
            label: "Definition",
            content: renderDrawerParagraphs([
              "Available cash aggregates current cash balances across portfolio cash instruments.",
              "Use it with projected cashflow to assess short-horizon funding capacity.",
            ]),
          },
          {
            key: "detail",
            label: "Underlying Detail",
            content: renderDrawerDefinitionList(
              workspace.cash_balances?.length
                ? workspace.cash_balances.map((balance) => [
                    balance.instrument_name,
                    formatCurrency(
                      balance.market_value_base ?? balance.quantity,
                      workspace.portfolio.base_currency
                    ),
                  ])
                : [["Cash Accounts", "No published cash balances available"]]
            ),
          },
        ],
        fullPageHref: "#portfolio-insights",
        fullPageLabel: "Open liquidity",
      };
  }
}

export function buildExceptionDrawer(
  exception: {
    key: string;
    title: string;
    detail: string;
    tone: "neutral" | "success" | "warn" | "danger";
    href: string;
  },
  workspace: PortfolioWorkspace,
  context: PortfolioWorkspaceContext,
  affectedPositions: PortfolioPositionView[] = []
): PortfolioDetailDrawerState {
  const tabs: PortfolioDetailDrawerState["tabs"] = [
    {
      key: "explanation",
      label: "Explanation",
      content: renderDrawerParagraphs([exception.detail]),
    },
    {
      key: "evidence",
      label: "Evidence",
      content: renderDrawerDefinitionList(resolveExceptionEvidence(exception.key, workspace)),
    },
  ];

  if (exception.key === "pricing" && affectedPositions.length) {
    tabs.push({
      key: "affected-holdings",
      label: "Affected Holdings",
      content: renderDrawerDefinitionList(
        affectedPositions.slice(0, 8).map((position) => [
          position.instrument_name,
          position.market_price == null && position.market_value_base == null
            ? "Price and valuation missing"
            : position.market_price == null
              ? "Price missing"
              : "Valuation missing",
        ])
      ),
    });
  }

  return {
    kicker: "Readiness Issue",
    title: exception.title,
    subtitle: "Operational explanation and current evidence for this portfolio gap.",
    summaryItems: [
      { label: "Severity", value: formatStatus(exception.tone) },
      { label: "Portfolio", value: workspace.portfolio.portfolio_id },
      { label: "As of", value: formatDate(context.selectedAsOfDate) },
    ],
    tabs,
    fullPageHref: exception.href,
    fullPageLabel: "Open related section",
  };
}

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
      { label: "Matches", value: formatCount(transactions.length, "transaction") },
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

function resolveExceptionEvidence(
  key: string,
  workspace: PortfolioWorkspace
): Array<[string, string]> {
  switch (key) {
    case "holdings":
      return [
        ["Positions", formatCount(workspace.positions.length, "position")],
        ["Top Holdings", formatCount(workspace.top_positions.length, "holding")],
        [
          "Reported Position Count",
          formatCount(workspace.summary.position_count, "holding"),
        ],
      ];
    case "pricing":
      return [
        [
          "Valued Positions",
          formatCount(
            workspace.positions.filter((position) => (position.market_value_base ?? 0) > 0)
              .length,
            "position"
          ),
        ],
        ["Allocation Views", String(workspace.allocation_views?.length ?? 0)],
        [
          "Failed Valuation Jobs",
          String(workspace.operations?.failed_valuation_jobs_within_window ?? 0),
        ],
      ];
    case "transactions":
      return [
        [
          "Transactions in View",
          formatCount(workspace.recent_transactions.length, "transaction"),
        ],
        [
          "Latest Booked Transaction",
          formatDate(workspace.operations?.latest_booked_transaction_date),
        ],
        ["Window End", formatDate(workspace.as_of_date)],
      ];
    case "reporting":
      return [
        ["Reporting Status", formatStatus(workspace.readiness.reporting.status)],
        ["Report Rows", String(workspace.readiness.reporting.row_count)],
        ["Generated At", formatDate(workspace.readiness.reporting.generated_at_utc)],
      ];
    case "controls_blocking":
      return [
        [
          "Publishing Allowed",
          formatBooleanFlag(workspace.operations?.publish_allowed),
        ],
        [
          "Blocking Controls",
          formatBooleanFlag(workspace.operations?.controls_blocking),
        ],
        [
          "Active Reprocessing Keys",
          String(workspace.operations?.active_reprocessing_keys ?? 0),
        ],
      ];
    default: {
      const failure = workspace.partial_failures.find(
        (item) => `partial_failure_${item.error_code}` === key
      );
      return [
        ["Source Service", failure?.source_service ?? "Unknown"],
        ["Error Code", failure?.error_code ?? "Unknown"],
        ["Detail", failure?.detail ?? "No additional evidence available"],
      ];
    }
  }
}

function renderDrawerDefinitionList(entries: Array<[string, string]>): ReactNode {
  return (
    <dl className="portfolio-detail-drawer-definition-list">
      {entries.map(([label, value]) => (
        <div key={`${label}-${value}`} className="portfolio-detail-drawer-definition-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function renderDrawerParagraphs(paragraphs: string[]): ReactNode {
  return (
    <div className="portfolio-detail-drawer-copy">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function formatActivityBucketLabel(value: string): string {
  return formatLabel(value.toLowerCase());
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
