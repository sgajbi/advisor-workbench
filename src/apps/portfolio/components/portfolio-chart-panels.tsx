"use client";

import { useMemo, useState } from "react";

import { AnalyticsTable } from "@/design-system";

import {
  formatCurrency,
  formatDate,
  formatPct,
  formatQuantity,
} from "../formatters";
import type {
  PortfolioActivitySummaryView,
  PortfolioIncomeSummaryView,
  PortfolioTopPosition,
  PortfolioWorkspace,
} from "../types";

const CHART_COLORS = {
  accent: "#315d8a",
  accentSoft: "#7f9db8",
  accentMuted: "#b8cad9",
  positive: "#4b7d62",
  negative: "#a15a3f",
  neutral: "#8b99a6",
  line: "#315d8a",
  fill: "#dbe7f0",
} as const;

type HoldingsMetric = "market_value" | "weight";

export function PortfolioTopHoldingsPanel({
  positions,
  baseCurrency,
  selectedSecurityId,
  onSelectionChange,
}: {
  positions: PortfolioTopPosition[];
  baseCurrency: string;
  selectedSecurityId: string | null;
  onSelectionChange: (securityId: string | null) => void;
}) {
  const [metric, setMetric] = useState<HoldingsMetric>("market_value");
  const [hoveredSecurityId, setHoveredSecurityId] = useState<string | null>(null);
  const sortedPositions = useMemo(() => {
    return [...positions].sort((left, right) => {
      const leftMetric =
        metric === "market_value" ? left.market_value_base ?? 0 : left.weight_pct ?? 0;
      const rightMetric =
        metric === "market_value" ? right.market_value_base ?? 0 : right.weight_pct ?? 0;
      return rightMetric - leftMetric;
    });
  }, [metric, positions]);
  const maxMetric = Math.max(
    ...sortedPositions.map((position) =>
      metric === "market_value" ? position.market_value_base ?? 0 : position.weight_pct ?? 0
    ),
    0
  );

  return (
    <div className="portfolio-chart-module">
      <div className="portfolio-chart-module-toolbar">
        <div className="portfolio-chart-toggle-group" aria-label="Top holdings metric">
          <button
            type="button"
            aria-pressed={metric === "market_value"}
            className={
              metric === "market_value"
                ? "portfolio-chart-toggle portfolio-chart-toggle-active"
                : "portfolio-chart-toggle"
            }
            onClick={() => setMetric("market_value")}
          >
            Market Value
          </button>
          <button
            type="button"
            aria-pressed={metric === "weight"}
            className={
              metric === "weight"
                ? "portfolio-chart-toggle portfolio-chart-toggle-active"
                : "portfolio-chart-toggle"
            }
            onClick={() => setMetric("weight")}
          >
            Weight
          </button>
        </div>
      </div>
      <div className="portfolio-chart-module-body">
        <div className="portfolio-chart-card">
          <div className="portfolio-horizontal-bar-chart" aria-label="Top holdings chart" role="list">
            {sortedPositions.map((position) => {
              const metricValue =
                metric === "market_value" ? position.market_value_base ?? 0 : position.weight_pct ?? 0;
              const width = maxMetric > 0 ? `${(metricValue / maxMetric) * 100}%` : "0%";
              const selected = selectedSecurityId === position.security_id;
              const hovered = hoveredSecurityId === position.security_id;
              return (
                <button
                  key={position.security_id}
                  type="button"
                  role="listitem"
                  className={
                    selected
                      ? "portfolio-horizontal-bar-row portfolio-horizontal-bar-row-selected"
                      : hovered
                        ? "portfolio-horizontal-bar-row portfolio-horizontal-bar-row-hovered"
                        : "portfolio-horizontal-bar-row"
                  }
                  onMouseEnter={() => setHoveredSecurityId(position.security_id)}
                  onMouseLeave={() => setHoveredSecurityId(null)}
                  onClick={() =>
                    onSelectionChange(
                      selectedSecurityId === position.security_id ? null : position.security_id
                    )
                  }
                  aria-label={`${position.instrument_name}: ${
                    metric === "market_value"
                      ? formatCurrency(position.market_value_base, baseCurrency)
                      : formatPct(position.weight_pct)
                  }. Select to filter holdings.`}
                  title={buildTopHoldingTooltip(position, metric, baseCurrency)}
                >
                  <span className="portfolio-horizontal-bar-label">{position.instrument_name}</span>
                  <span className="portfolio-horizontal-bar-track">
                    <span
                      className="portfolio-horizontal-bar-fill"
                      style={{ width, backgroundColor: CHART_COLORS.accent }}
                    />
                  </span>
                  <span className="portfolio-horizontal-bar-value">
                    {metric === "market_value"
                      ? formatCurrency(position.market_value_base, baseCurrency)
                      : formatPct(position.weight_pct)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="portfolio-chart-card">
          <AnalyticsTable
            ariaLabel="Top holdings table"
            columns={[
              { key: "dimension", label: "Dimension" },
              { key: "marketValue", label: "Market Value", align: "right" },
              { key: "weight", label: "Weight", align: "right" },
              { key: "positions", label: "Positions", align: "right" },
            ]}
            rows={sortedPositions.map((position) => ({
              key: position.security_id,
              cells: [
                position.instrument_name,
                formatCurrency(position.market_value_base, baseCurrency),
                formatPct(position.weight_pct),
                1,
              ],
              ariaLabel: `${position.instrument_name}: ${formatCurrency(position.market_value_base, baseCurrency)}, ${formatPct(position.weight_pct)}`,
              className:
                selectedSecurityId === position.security_id
                  ? "portfolio-table-row-selected"
                  : hoveredSecurityId === position.security_id
                    ? "portfolio-table-row-hovered"
                    : undefined,
              onMouseEnter: () => setHoveredSecurityId(position.security_id),
              onMouseLeave: () => setHoveredSecurityId(null),
              onClick: () =>
                onSelectionChange(
                  selectedSecurityId === position.security_id ? null : position.security_id
                ),
            }))}
          />
        </div>
      </div>
    </div>
  );
}

export function PortfolioProjectedCashflowPanel({
  cashflowOutlook,
  baseCurrency,
}: {
  cashflowOutlook: NonNullable<PortfolioWorkspace["cashflow_outlook"]>;
  baseCurrency: string;
}) {
  const points = cashflowOutlook.upcoming_points;
  const values = points.flatMap((point) => [
    point.net_cashflow_base,
    point.projected_cumulative_cashflow_base,
  ]);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const range = Math.max(maxValue - minValue, 1);
  const chartPoints = points.map((point, index) => {
    const x = points.length === 1 ? 24 : 24 + (index / (points.length - 1)) * 272;
    const y = 156 - (((point.projected_cumulative_cashflow_base - minValue) / range) * 124 + 16);
    return { x: roundSvg(x), y: roundSvg(y), point };
  });
  const areaPath = buildAreaPath(chartPoints);
  const linePath = buildLinePath(chartPoints);

  return (
    <div className="portfolio-chart-card">
      <div className="portfolio-timeseries-chart">
        <svg
          viewBox="0 0 320 180"
          className="portfolio-timeseries-chart-svg"
          role="img"
          aria-label={`Projected cashflow chart in ${baseCurrency}`}
        >
          <path d={areaPath} className="portfolio-timeseries-chart-area" />
          <path d={linePath} className="portfolio-timeseries-chart-line" />
          {chartPoints.map(({ x, y, point }) => (
            <g key={point.projection_date}>
              <circle
                cx={x}
                cy={y}
                r="4"
                className="portfolio-timeseries-chart-point"
              >
                <title>{`${formatDate(point.projection_date)}: projected cumulative ${formatCurrency(
                  point.projected_cumulative_cashflow_base,
                  baseCurrency
                )}`}</title>
              </circle>
            </g>
          ))}
        </svg>
      </div>
      <div className="portfolio-timeseries-axis">
        {points.map((point) => (
          <span key={point.projection_date}>{formatDate(point.projection_date)}</span>
        ))}
      </div>
    </div>
  );
}

export function PortfolioActivityPanel({
  summary,
  selectedBucket,
  onSelectionChange,
}: {
  summary: PortfolioActivitySummaryView;
  selectedBucket?: string | null;
  onSelectionChange?: (bucket: string | null) => void;
}) {
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);
  const maxAmount = Math.max(
    ...summary.buckets.map((bucket) =>
      Math.max(
        Math.abs(bucket.requested_window.reporting_currency_amount),
        Math.abs(bucket.year_to_date.reporting_currency_amount)
      )
    ),
    1
  );

  return (
    <div className="portfolio-chart-card">
      <div className="portfolio-stacked-bar-chart" aria-label="Activity chart" role="list">
        {summary.buckets.map((bucket) => {
          const requestedAmount = bucket.requested_window.reporting_currency_amount;
          const ytdAmount = bucket.year_to_date.reporting_currency_amount;
          const selected = selectedBucket === bucket.bucket;
          const hovered = hoveredBucket === bucket.bucket;
          return (
            <button
              key={bucket.bucket}
              type="button"
              role="listitem"
              aria-label={`${buildActivityTooltip(bucket.bucket, requestedAmount, ytdAmount, summary.reporting_currency).replaceAll("\n", ". ")} Select to filter transactions.`}
              className={
                selected
                  ? "portfolio-stacked-bar-group portfolio-stacked-bar-group-selected"
                  : hovered
                  ? "portfolio-stacked-bar-group portfolio-stacked-bar-group-hovered"
                  : "portfolio-stacked-bar-group"
              }
              onMouseEnter={() => setHoveredBucket(bucket.bucket)}
              onMouseLeave={() => setHoveredBucket(null)}
              onClick={() => onSelectionChange?.(selected ? null : bucket.bucket)}
              title={buildActivityTooltip(bucket.bucket, requestedAmount, ytdAmount, summary.reporting_currency)}
            >
              <span className="portfolio-stacked-bar-group-label">
                {formatBucketLabel(bucket.bucket)}
              </span>
              <div className="portfolio-stacked-bar-columns">
                <div className="portfolio-stacked-bar-column">
                  <span className="portfolio-stacked-bar-column-label">Window</span>
                  <span className="portfolio-stacked-bar-track">
                    <span
                      className={
                        requestedAmount >= 0
                          ? "portfolio-stacked-bar-fill portfolio-stacked-bar-fill-positive"
                          : "portfolio-stacked-bar-fill portfolio-stacked-bar-fill-negative"
                      }
                      style={{ height: `${(Math.abs(requestedAmount) / maxAmount) * 100}%` }}
                    />
                  </span>
                  <span className="portfolio-stacked-bar-value">
                    {formatCurrency(requestedAmount, summary.reporting_currency)}
                  </span>
                </div>
                <div className="portfolio-stacked-bar-column">
                  <span className="portfolio-stacked-bar-column-label">YTD</span>
                  <span className="portfolio-stacked-bar-track">
                    <span
                      className={
                        ytdAmount >= 0
                          ? "portfolio-stacked-bar-fill portfolio-stacked-bar-fill-positive"
                          : "portfolio-stacked-bar-fill portfolio-stacked-bar-fill-negative"
                      }
                      style={{ height: `${(Math.abs(ytdAmount) / maxAmount) * 100}%` }}
                    />
                  </span>
                  <span className="portfolio-stacked-bar-value">
                    {formatCurrency(ytdAmount, summary.reporting_currency)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PortfolioIncomePanel({
  summary,
}: {
  summary: PortfolioIncomeSummaryView;
}) {
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const maxAmount = Math.max(
    ...summary.income_types.flatMap((item) => [
      item.requested_window.gross.reporting_currency_amount,
      item.requested_window.net.reporting_currency_amount,
    ]),
    summary.totals_requested_window.gross.reporting_currency_amount,
    1
  );

  return (
    <div className="portfolio-chart-card">
      <div className="portfolio-grouped-bar-chart" aria-label="Income chart" role="list">
        {summary.income_types.map((item) => {
          const hovered = hoveredType === item.income_type;
          return (
            <div
              key={item.income_type}
              role="listitem"
              aria-label={buildIncomeTooltip(item, summary.reporting_currency).replaceAll("\n", ". ")}
              className={
                hovered
                  ? "portfolio-grouped-bar-group portfolio-grouped-bar-group-hovered"
                  : "portfolio-grouped-bar-group"
              }
              onMouseEnter={() => setHoveredType(item.income_type)}
              onMouseLeave={() => setHoveredType(null)}
              title={buildIncomeTooltip(item, summary.reporting_currency)}
            >
              <span className="portfolio-grouped-bar-group-label">
                {formatBucketLabel(item.income_type)}
              </span>
              <div className="portfolio-grouped-bar-columns">
                <div className="portfolio-grouped-bar-column">
                  <span className="portfolio-grouped-bar-column-label">Gross</span>
                  <span className="portfolio-grouped-bar-track">
                    <span
                      className="portfolio-grouped-bar-fill"
                      style={{
                        height: `${(item.requested_window.gross.reporting_currency_amount / maxAmount) * 100}%`,
                        backgroundColor: CHART_COLORS.accentSoft,
                      }}
                    />
                  </span>
                  <span className="portfolio-grouped-bar-value">
                    {formatCurrency(item.requested_window.gross.reporting_currency_amount, summary.reporting_currency)}
                  </span>
                </div>
                <div className="portfolio-grouped-bar-column">
                  <span className="portfolio-grouped-bar-column-label">Net</span>
                  <span className="portfolio-grouped-bar-track">
                    <span
                      className="portfolio-grouped-bar-fill"
                      style={{
                        height: `${(item.requested_window.net.reporting_currency_amount / maxAmount) * 100}%`,
                        backgroundColor: CHART_COLORS.accent,
                      }}
                    />
                  </span>
                  <span className="portfolio-grouped-bar-value">
                    {formatCurrency(item.requested_window.net.reporting_currency_amount, summary.reporting_currency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildTopHoldingTooltip(
  position: PortfolioTopPosition,
  metric: HoldingsMetric,
  currency: string
): string {
  return [
    position.instrument_name,
    `Market value: ${formatCurrency(position.market_value_base, currency)}`,
    `Weight: ${formatPct(position.weight_pct)}`,
    `Quantity: ${formatQuantity(position.quantity)}`,
    `Focus metric: ${
      metric === "market_value"
        ? formatCurrency(position.market_value_base, currency)
        : formatPct(position.weight_pct)
    }`,
  ].join("\n");
}

function buildActivityTooltip(
  bucket: string,
  requestedAmount: number,
  ytdAmount: number,
  currency: string
): string {
  return [
    formatBucketLabel(bucket),
    `Window: ${formatCurrency(requestedAmount, currency)}`,
    `YTD: ${formatCurrency(ytdAmount, currency)}`,
  ].join("\n");
}

function buildIncomeTooltip(
  item: PortfolioIncomeSummaryView["income_types"][number],
  currency: string
): string {
  return [
    formatBucketLabel(item.income_type),
    `Window gross: ${formatCurrency(item.requested_window.gross.reporting_currency_amount, currency)}`,
    `Window net: ${formatCurrency(item.requested_window.net.reporting_currency_amount, currency)}`,
    `Window transactions: ${item.requested_window.net.transaction_count}`,
  ].join("\n");
}

function formatBucketLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildLinePath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) {
    return "";
  }
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function buildAreaPath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) {
    return "";
  }
  const first = points[0];
  const last = points[points.length - 1];
  return [
    `M ${first.x} 164`,
    ...points.map((point, index) => `${index === 0 ? "L" : "L"} ${point.x} ${point.y}`),
    `L ${last.x} 164`,
    "Z",
  ].join(" ");
}

function roundSvg(value: number): number {
  return Number(value.toFixed(2));
}
