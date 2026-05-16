"use client";

import { useState } from "react";

import {
  WorkbenchSummaryVisualLabel,
  WorkbenchSummaryVisualMeta,
  WorkbenchSummaryVisualValue,
} from "@/design-system";

import { formatCurrency, formatDate } from "../formatters";
import {
  buildIncomeTooltip,
  formatBucketLabel,
} from "../portfolio-chart-view-model";
import type { PortfolioIncomeSummaryView } from "../types";

const INCOME_CHART_COLORS = {
  gross: "#b8cad9",
  net: "#315d8a",
} as const;

export default function PortfolioIncomePanel({
  summary,
  compact = false,
}: {
  summary: PortfolioIncomeSummaryView;
  compact?: boolean;
}) {
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const maxAmount = Math.max(
    ...summary.income_types.flatMap((item) => [
      item.requested_window.gross.reporting_currency_amount,
      item.requested_window.net.reporting_currency_amount,
    ]),
    summary.totals_requested_window.gross.reporting_currency_amount,
    1,
  );

  return (
    <div
      className={
        compact
          ? "portfolio-analytics-canvas portfolio-chart-card portfolio-chart-card-analytic portfolio-chart-card-compact"
          : "portfolio-analytics-canvas portfolio-chart-card portfolio-chart-card-analytic"
      }
    >
      <div className="portfolio-analytical-utility-header">
        <span>Requested Window</span>
        <strong>{`${formatDate(summary.window_start_date)} - ${formatDate(summary.window_end_date)}`}</strong>
      </div>
      <div
        className={
          compact
            ? "portfolio-income-chart portfolio-income-chart-compact"
            : "portfolio-income-chart"
        }
        aria-label="Income chart"
        role="list"
      >
        {summary.income_types.map((item) => {
          const hovered = hoveredType === item.income_type;
          const grossAmount =
            item.requested_window.gross.reporting_currency_amount;
          const netAmount = item.requested_window.net.reporting_currency_amount;
          const deductionsAmount =
            item.requested_window.withholding_tax.reporting_currency_amount +
            item.requested_window.other_deductions.reporting_currency_amount;
          const grossWidth = `${(grossAmount / maxAmount) * 100}%`;
          const netWidth = `${(netAmount / maxAmount) * 100}%`;

          return (
            <div
              key={item.income_type}
              role="listitem"
              aria-label={buildIncomeTooltip(
                item,
                summary.reporting_currency,
              ).replaceAll("\n", ". ")}
              className={
                hovered
                  ? compact
                    ? "portfolio-grouped-bar-group portfolio-grouped-bar-group-compact portfolio-grouped-bar-group-hovered"
                    : "portfolio-grouped-bar-group portfolio-grouped-bar-group-hovered"
                  : compact
                    ? "portfolio-grouped-bar-group portfolio-grouped-bar-group-compact"
                    : "portfolio-grouped-bar-group"
              }
              onMouseEnter={() => setHoveredType(item.income_type)}
              onMouseLeave={() => setHoveredType(null)}
              title={buildIncomeTooltip(item, summary.reporting_currency)}
            >
              <div className="portfolio-income-row-header">
                <WorkbenchSummaryVisualLabel className="portfolio-income-row-label">
                  {formatBucketLabel(item.income_type)}
                </WorkbenchSummaryVisualLabel>
                <WorkbenchSummaryVisualValue className="portfolio-income-row-value">
                  {formatCurrency(netAmount, summary.reporting_currency)}
                </WorkbenchSummaryVisualValue>
              </div>
              <div className="portfolio-income-row-chart" aria-hidden="true">
                <span className="portfolio-income-row-track" />
                <span
                  className="portfolio-income-row-bar portfolio-income-row-bar-gross"
                  style={{
                    width: grossWidth,
                    backgroundColor: INCOME_CHART_COLORS.gross,
                  }}
                />
                <span
                  className="portfolio-income-row-bar portfolio-income-row-bar-net"
                  style={{
                    width: netWidth,
                    backgroundColor: INCOME_CHART_COLORS.net,
                  }}
                />
              </div>
              {compact ? (
                <WorkbenchSummaryVisualMeta className="portfolio-income-row-meta portfolio-income-row-meta-compact">
                  <span>
                    Gross{" "}
                    {formatCurrency(grossAmount, summary.reporting_currency)}
                  </span>
                  <span>
                    {item.requested_window.net.transaction_count} events
                  </span>
                </WorkbenchSummaryVisualMeta>
              ) : (
                <WorkbenchSummaryVisualMeta className="portfolio-income-row-meta">
                  <span>
                    Gross{" "}
                    {formatCurrency(grossAmount, summary.reporting_currency)}
                  </span>
                  <span>
                    Deductions{" "}
                    {formatCurrency(
                      deductionsAmount,
                      summary.reporting_currency,
                    )}
                  </span>
                  <span>{item.requested_window.net.transaction_count} txn</span>
                </WorkbenchSummaryVisualMeta>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
