"use client";

import { useMemo, useState } from "react";

import {
  WorkbenchSummaryToolbar,
  WorkbenchSummaryVisualCard,
  WorkbenchSummaryVisualLabel,
  WorkbenchSummaryVisualMeta,
  WorkbenchSummaryVisualValue,
} from "@/design-system";

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
      <WorkbenchSummaryToolbar className="portfolio-chart-module-toolbar">
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
      </WorkbenchSummaryToolbar>
      <div className="portfolio-chart-module-body portfolio-top-holdings-body">
        <WorkbenchSummaryVisualCard className="portfolio-chart-card portfolio-top-holdings-list-card">
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
                  <WorkbenchSummaryVisualLabel className="portfolio-horizontal-bar-label">
                    {position.instrument_name}
                  </WorkbenchSummaryVisualLabel>
                  <span className="portfolio-horizontal-bar-track">
                    <span
                      className="portfolio-horizontal-bar-fill"
                      style={{ width, backgroundColor: CHART_COLORS.accent }}
                    />
                  </span>
                  <WorkbenchSummaryVisualValue className="portfolio-horizontal-bar-value">
                    {metric === "market_value"
                      ? formatCurrency(position.market_value_base, baseCurrency)
                      : formatPct(position.weight_pct)}
                  </WorkbenchSummaryVisualValue>
                </button>
              );
            })}
          </div>
        </WorkbenchSummaryVisualCard>
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
  const cumulativeValues = points.map((point) => point.projected_cumulative_cashflow_base);
  const flowValues = points.map((point) => point.net_cashflow_base);
  const minValue = Math.min(...cumulativeValues, 0);
  const maxValue = Math.max(...cumulativeValues, 0);
  const range = Math.max(maxValue - minValue, 1);
  const maxFlow = Math.max(...flowValues.map((value) => Math.abs(value)), 1);
  const finalCumulative =
    points[points.length - 1]?.projected_cumulative_cashflow_base ?? cashflowOutlook.total_net_cashflow_base;
  const positiveFlowCount = flowValues.filter((value) => value > 0).length;
  const negativeFlowCount = flowValues.filter((value) => value < 0).length;
  const chartPoints = points.map((point, index) => {
    const x = points.length === 1 ? 28 : 28 + (index / (points.length - 1)) * 264;
    const y = 172 - (((point.projected_cumulative_cashflow_base - minValue) / range) * 112 + 24);
    return { x: roundSvg(x), y: roundSvg(y), point };
  });
  const areaPath = buildAreaPath(chartPoints);
  const linePath = buildLinePath(chartPoints);
  const zeroLineY = roundSvg(172 - (((0 - minValue) / range) * 112 + 24));

  return (
      <div className="portfolio-chart-card">
      <div className="portfolio-cashflow-summary-strip" aria-label="Projected cashflow summary">
        <div className="portfolio-cashflow-summary-stat">
          <span>Net Flow</span>
          <strong>{formatCurrency(cashflowOutlook.total_net_cashflow_base, baseCurrency)}</strong>
        </div>
        <div className="portfolio-cashflow-summary-stat">
          <span>End Horizon</span>
          <strong>{formatCurrency(finalCumulative, baseCurrency)}</strong>
        </div>
        <div className="portfolio-cashflow-summary-stat">
          <span>Forecast Mix</span>
          <strong>{`${positiveFlowCount} in / ${negativeFlowCount} out`}</strong>
        </div>
      </div>
      <div className="portfolio-cashflow-chart">
        <svg
          viewBox="0 0 320 196"
          className="portfolio-timeseries-chart-svg"
          role="img"
          aria-label={`Projected cashflow chart in ${baseCurrency}`}
        >
          <line
            x1="24"
            x2="296"
            y1={zeroLineY}
            y2={zeroLineY}
            className="portfolio-cashflow-zero-line"
          />
          {points.map((point, index) => {
            const x = points.length === 1 ? 28 : 28 + (index / (points.length - 1)) * 264;
            const width = points.length === 1 ? 28 : Math.max(12, 188 / points.length);
            const height = (Math.abs(point.net_cashflow_base) / maxFlow) * 46;
            const y =
              point.net_cashflow_base >= 0 ? zeroLineY - height : zeroLineY;
            return (
              <g key={`flow-${point.projection_date}`}>
                <rect
                  x={roundSvg(x - width / 2)}
                  y={roundSvg(y)}
                  width={roundSvg(width)}
                  height={roundSvg(Math.max(height, 2))}
                  rx="4"
                  className={
                    point.net_cashflow_base >= 0
                      ? "portfolio-cashflow-flow-bar portfolio-cashflow-flow-bar-positive"
                      : "portfolio-cashflow-flow-bar portfolio-cashflow-flow-bar-negative"
                  }
                >
                  <title>{`${formatDate(point.projection_date)}: net flow ${formatCurrency(
                    point.net_cashflow_base,
                    baseCurrency
                  )}`}</title>
                </rect>
              </g>
            );
          })}
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
      <div className="portfolio-cashflow-axis-grid">
        {points.map((point) => (
          <div key={point.projection_date} className="portfolio-cashflow-axis-item">
            <span>{formatDate(point.projection_date)}</span>
            <strong>{formatCurrency(point.net_cashflow_base, baseCurrency)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortfolioActivityPanel({
  summary,
  selectedBucket,
  onSelectionChange,
  compact = false,
}: {
  summary: PortfolioActivitySummaryView;
  selectedBucket?: string | null;
  onSelectionChange?: (bucket: string | null) => void;
  compact?: boolean;
}) {
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);
  const maxAmount = Math.max(
    ...summary.buckets.map((bucket) => Math.abs(bucket.requested_window.reporting_currency_amount)),
    1
  );

  return (
    <WorkbenchSummaryVisualCard
      className={
        compact
          ? "portfolio-chart-card portfolio-chart-card-analytic portfolio-chart-card-compact"
          : "portfolio-chart-card portfolio-chart-card-analytic"
      }
    >
      <div
        className={compact ? "portfolio-flow-chart portfolio-flow-chart-compact" : "portfolio-flow-chart"}
        aria-label="Activity chart"
        role="list"
      >
        {summary.buckets.map((bucket) => {
          const requestedAmount = bucket.requested_window.reporting_currency_amount;
          const ytdAmount = bucket.year_to_date.reporting_currency_amount;
          const selected = selectedBucket === bucket.bucket;
          const hovered = hoveredBucket === bucket.bucket;
          const magnitude = Math.abs(requestedAmount);
          const width = `${(magnitude / maxAmount) * 100}%`;
          const direction = requestedAmount < 0 ? "negative" : "positive";

          return (
            <button
              key={bucket.bucket}
              type="button"
              role="listitem"
              aria-label={`${buildActivityTooltip(bucket.bucket, requestedAmount, ytdAmount, summary.reporting_currency).replaceAll("\n", ". ")} Select to filter transactions.`}
              className={
                selected
                  ? compact
                    ? "portfolio-stacked-bar-group portfolio-stacked-bar-group-compact portfolio-stacked-bar-group-selected"
                    : "portfolio-stacked-bar-group portfolio-stacked-bar-group-selected"
                  : hovered
                  ? compact
                    ? "portfolio-stacked-bar-group portfolio-stacked-bar-group-compact portfolio-stacked-bar-group-hovered"
                    : "portfolio-stacked-bar-group portfolio-stacked-bar-group-hovered"
                  : compact
                  ? "portfolio-stacked-bar-group portfolio-stacked-bar-group-compact"
                  : "portfolio-stacked-bar-group"
              }
              onMouseEnter={() => setHoveredBucket(bucket.bucket)}
              onMouseLeave={() => setHoveredBucket(null)}
              onClick={() => onSelectionChange?.(selected ? null : bucket.bucket)}
              title={buildActivityTooltip(bucket.bucket, requestedAmount, ytdAmount, summary.reporting_currency)}
            >
              <div className="portfolio-flow-row-header">
                <WorkbenchSummaryVisualLabel className="portfolio-flow-row-label">
                  {formatBucketLabel(bucket.bucket)}
                </WorkbenchSummaryVisualLabel>
                <WorkbenchSummaryVisualValue className="portfolio-flow-row-value">
                  {formatCurrency(requestedAmount, summary.reporting_currency)}
                </WorkbenchSummaryVisualValue>
              </div>
              <div className="portfolio-flow-row-chart" aria-hidden="true">
                <span className="portfolio-flow-row-axis" />
                <span
                  className={`portfolio-flow-row-bar portfolio-flow-row-bar-${direction}`}
                  style={
                    requestedAmount < 0
                      ? { width, left: `calc(50% - ${width})` }
                      : { width, left: "50%" }
                  }
                />
              </div>
              {compact ? (
                <WorkbenchSummaryVisualMeta className="portfolio-flow-row-meta portfolio-flow-row-meta-compact">
                  <span>YTD {formatCurrency(ytdAmount, summary.reporting_currency)}</span>
                  <span>{bucket.requested_window.transaction_count} events</span>
                </WorkbenchSummaryVisualMeta>
              ) : (
                <WorkbenchSummaryVisualMeta className="portfolio-flow-row-meta">
                  <span>{requestedAmount < 0 ? "Window outflow" : "Window inflow"}</span>
                  <span>YTD {formatCurrency(ytdAmount, summary.reporting_currency)}</span>
                  <span>{bucket.requested_window.transaction_count} txn</span>
                </WorkbenchSummaryVisualMeta>
              )}
            </button>
          );
        })}
      </div>
    </WorkbenchSummaryVisualCard>
  );
}

export function PortfolioIncomePanel({
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
    1
  );

  return (
    <WorkbenchSummaryVisualCard
      className={
        compact
          ? "portfolio-chart-card portfolio-chart-card-analytic portfolio-chart-card-compact"
          : "portfolio-chart-card portfolio-chart-card-analytic"
      }
    >
      <div
        className={compact ? "portfolio-income-chart portfolio-income-chart-compact" : "portfolio-income-chart"}
        aria-label="Income chart"
        role="list"
      >
        {summary.income_types.map((item) => {
          const hovered = hoveredType === item.income_type;
          const grossAmount = item.requested_window.gross.reporting_currency_amount;
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
              aria-label={buildIncomeTooltip(item, summary.reporting_currency).replaceAll("\n", ". ")}
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
                  style={{ width: grossWidth, backgroundColor: CHART_COLORS.accentMuted }}
                />
                <span
                  className="portfolio-income-row-bar portfolio-income-row-bar-net"
                  style={{ width: netWidth, backgroundColor: CHART_COLORS.accent }}
                />
              </div>
              {compact ? (
                <WorkbenchSummaryVisualMeta className="portfolio-income-row-meta portfolio-income-row-meta-compact">
                  <span>Gross {formatCurrency(grossAmount, summary.reporting_currency)}</span>
                  <span>{item.requested_window.net.transaction_count} events</span>
                </WorkbenchSummaryVisualMeta>
              ) : (
                <WorkbenchSummaryVisualMeta className="portfolio-income-row-meta">
                  <span>Gross {formatCurrency(grossAmount, summary.reporting_currency)}</span>
                  <span>Deductions {formatCurrency(deductionsAmount, summary.reporting_currency)}</span>
                  <span>{item.requested_window.net.transaction_count} txn</span>
                </WorkbenchSummaryVisualMeta>
              )}
            </div>
          );
        })}
      </div>
    </WorkbenchSummaryVisualCard>
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
