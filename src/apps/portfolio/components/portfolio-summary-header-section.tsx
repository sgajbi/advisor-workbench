"use client";

import { Panel } from "@/design-system";

import { formatCurrency, formatPct } from "../formatters";
import {
  getPortfolioSummaryValueToneClass,
  resolvePortfolioPerformancePeriodReturns,
} from "../portfolio-summary-view-model";
import {
  formatShareOfPortfolioValue,
  PORTFOLIO_VALUE_COPY,
  PORTFOLIO_VALUE_LABEL,
} from "../portfolio-terminology";
import type { PortfolioWorkspace } from "../types";
import {
  getInvestedAssetWeight,
} from "../view-model";
import PortfolioHealthStrip from "../modules/portfolio-health/portfolio-health-strip";
import type { PortfolioMetricDrawerKey } from "./portfolio-detail-drawer-builders";

export default function PortfolioSummaryHeaderSection({
  workspace,
  onOpenMetricDrawer,
}: {
  workspace: PortfolioWorkspace;
  onOpenMetricDrawer: (metric: PortfolioMetricDrawerKey) => void;
}) {
  const performanceReturns = resolvePortfolioPerformancePeriodReturns(workspace);
  return (
    <section
      id="portfolio-summary"
      className="portfolio-workspace-section portfolio-summary-cluster-section portfolio-summary-cluster-hero"
    >
      <Panel className="portfolio-hero portfolio-book-hero portfolio-operating-header">
        <PortfolioHealthStrip
          tiles={[
            {
              key: "portfolio_value",
              label: PORTFOLIO_VALUE_LABEL,
              value: formatCurrency(workspace.summary.market_value_base, workspace.portfolio.base_currency, 0),
              definition: PORTFOLIO_VALUE_COPY.description,
              support: "Portfolio base currency",
              onClick: () => onOpenMetricDrawer("portfolio_value"),
            },
            {
              key: "invested_assets",
              label: "Invested assets",
              value: formatCurrency(
                workspace.summary.invested_market_value_base,
                workspace.portfolio.base_currency,
                0
              ),
              definition:
                "Market value currently invested in funded positions, excluding operational cash inventory.",
              support: formatShareOfPortfolioValue(
                formatPct(getInvestedAssetWeight(workspace))
              ),
              onClick: () => onOpenMetricDrawer("invested_assets"),
            },
            {
              key: "available_cash",
              label: "Cash",
              value: formatCurrency(workspace.summary.total_cash_base, workspace.portfolio.base_currency, 0),
              definition:
                "Available cash inventory in the portfolio base currency across published cash balances.",
              support: formatShareOfPortfolioValue(
                formatPct(workspace.summary.cash_weight_pct)
              ),
              onClick: () => onOpenMetricDrawer("available_cash"),
            },
            {
              key: "mtd_return",
              label: "MTD return",
              value: renderPerformanceReturn(performanceReturns, "MTD"),
              definition: "Month-to-date net return for the selected portfolio.",
              support: "Net return",
            },
            {
              key: "qtd_return",
              label: "QTD return",
              value: renderPerformanceReturn(performanceReturns, "QTD"),
              definition: "Quarter-to-date net return for the selected portfolio.",
              support: "Net return",
            },
            {
              key: "ytd_return",
              label: "YTD return",
              value: renderPerformanceReturn(performanceReturns, "YTD"),
              definition: "Year-to-date net return for the selected portfolio.",
              support: "Net return",
            },
          ]}
        />
      </Panel>
    </section>
  );
}

function renderPerformanceReturn(
  rows: ReturnType<typeof resolvePortfolioPerformancePeriodReturns>,
  period: "MTD" | "QTD" | "YTD"
) {
  const value = rows.find((row) => row.period === period)?.returnPct ?? null;
  return <span className={getPortfolioSummaryValueToneClass(value)}>{formatPct(value)}</span>;
}
