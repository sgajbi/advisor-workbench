"use client";

import { formatCurrency, formatDate, formatPct } from "../formatters";
import type { PortfolioWorkspace } from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";
import { getInvestedAssetWeight } from "../view-model";
import {
  renderDrawerDefinitionList,
  renderDrawerParagraphs,
} from "./portfolio-detail-drawer-shared";
import type {
  PortfolioDetailDrawerState,
  PortfolioMetricDrawerKey,
} from "./portfolio-detail-drawer-types";

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
        fullPageHref: `/workbench/${encodeURIComponent(workspace.portfolio.portfolio_id)}`,
        fullPageLabel: "Open operating workbench",
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
        fullPageHref: `/positions?portfolioId=${encodeURIComponent(workspace.portfolio.portfolio_id)}`,
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
              "Use it with projected cash movement to review expected near-term inflows and outflows.",
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
        fullPageHref: `/cashflow?portfolioId=${encodeURIComponent(workspace.portfolio.portfolio_id)}`,
        fullPageLabel: "Open liquidity",
      };
  }
}
