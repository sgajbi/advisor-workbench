"use client";

import { Panel } from "@/design-system";

import { formatCurrency, formatPct } from "../formatters";
import {
  getPortfolioSummaryValueToneClass,
  resolvePortfolioPerformancePeriodReturns,
} from "../portfolio-summary-view-model";
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
              key: "aum",
              label: "AUM",
              value: formatCurrency(workspace.summary.market_value_base, workspace.portfolio.base_currency, 0),
              definition:
                "Total portfolio market value in the portfolio base currency at the stated valuation date.",
              support: "Portfolio base currency",
              onClick: () => onOpenMetricDrawer("aum"),
            },
            {
              key: "invested_assets",
              label: "Invested Assets",
              value: formatCurrency(
                workspace.summary.invested_market_value_base,
                workspace.portfolio.base_currency,
                0
              ),
              definition:
                "Market value currently invested in funded holdings, excluding operational cash inventory.",
              support: `${formatPct(getInvestedAssetWeight(workspace))} of AUM`,
              onClick: () => onOpenMetricDrawer("invested_assets"),
            },
            {
              key: "available_cash",
              label: "Cash",
              value: formatCurrency(workspace.summary.total_cash_base, workspace.portfolio.base_currency, 0),
              definition:
                "Available cash inventory in the portfolio base currency across published cash balances.",
              support: `${formatPct(workspace.summary.cash_weight_pct)} of AUM`,
              onClick: () => onOpenMetricDrawer("available_cash"),
            },
            {
              key: "mtd_return",
              label: "MTD Return",
              value: renderPerformanceReturn(performanceReturns, "MTD"),
              definition: "Month-to-date net return for the selected book.",
              support: "Net return",
            },
            {
              key: "qtd_return",
              label: "QTD Return",
              value: renderPerformanceReturn(performanceReturns, "QTD"),
              definition: "Quarter-to-date net return for the selected book.",
              support: "Net return",
            },
            {
              key: "ytd_return",
              label: "YTD Return",
              value: renderPerformanceReturn(performanceReturns, "YTD"),
              definition: "Year-to-date net return for the selected book.",
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
