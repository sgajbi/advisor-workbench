"use client";

import { formatCurrency, formatDate, formatPct } from "../formatters";
import { PORTFOLIO_VALUE_COPY } from "../portfolio-terminology";
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
import { buildReviewContextHref } from "@/shell/review-context";

export function buildMetricDrawer(
  metric: PortfolioMetricDrawerKey,
  workspace: PortfolioWorkspace,
  context: PortfolioWorkspaceContext
): PortfolioDetailDrawerState {
  const commonSummary = [
    { label: "Portfolio", value: workspace.portfolio.portfolio_id },
    { label: "Valuation date", value: formatDate(workspace.as_of_date) },
    ...(workspace.as_of_date !== context.selectedAsOfDate
      ? [{ label: "Review date", value: formatDate(context.selectedAsOfDate) }]
      : []),
  ];
  const reviewContext = {
    portfolioId: workspace.portfolio.portfolio_id,
    asOfDate: context.selectedAsOfDate,
    period: context.timeWindow,
    reportingCurrency: context.selectedReportingCurrency,
  } as const;

  switch (metric) {
    case "portfolio_value":
      return {
        kicker: "Metric Detail",
        title: PORTFOLIO_VALUE_COPY.title,
        subtitle: PORTFOLIO_VALUE_COPY.description,
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
            content: renderDrawerParagraphs(
              PORTFOLIO_VALUE_COPY.definition
            ),
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
        fullPageHref: buildReviewContextHref(
          `/workbench/${encodeURIComponent(workspace.portfolio.portfolio_id)}`,
          reviewContext,
        ),
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
              "Invested assets indicates how much of the portfolio is currently allocated to positions.",
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
        fullPageHref: buildReviewContextHref("/positions", reviewContext),
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
        fullPageHref: buildReviewContextHref("/cashflow", reviewContext),
        fullPageLabel: "Open liquidity",
      };
  }
}
