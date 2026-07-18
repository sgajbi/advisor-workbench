"use client";

import { formatCurrency, formatDate } from "../formatters";
import {
  buildProjectedCashflowChartModel,
  formatCashflowNetFlowTitle,
  formatCashflowPointTitle,
} from "../portfolio-chart-view-model";
import type { PortfolioWorkspace } from "../types";

export default function PortfolioProjectedCashflowPanel({
  cashflowOutlook,
  baseCurrency,
}: {
  cashflowOutlook: NonNullable<PortfolioWorkspace["cashflow_outlook"]>;
  baseCurrency: string;
}) {
  const chartModel = buildProjectedCashflowChartModel(cashflowOutlook);

  return (
    <div
      className={
        chartModel.flatCashflow
          ? "portfolio-chart-card portfolio-cashflow-card portfolio-cashflow-card-flat"
          : "portfolio-chart-card portfolio-cashflow-card"
      }
    >
      <div className="portfolio-cashflow-summary-strip" aria-label="Projected cashflow summary">
        <div className="portfolio-cashflow-summary-stat">
          <span>Net Projected Movement</span>
          <strong>{formatCurrency(cashflowOutlook.total_net_cashflow_base, baseCurrency)}</strong>
        </div>
        <div className="portfolio-cashflow-summary-stat">
          <span>Horizon</span>
          <strong>{`${cashflowOutlook.projection_days} days`}</strong>
        </div>
        <div className="portfolio-cashflow-summary-stat">
          <span>Largest Inflow</span>
          <strong>
            {chartModel.largestInflow
              ? formatCurrency(chartModel.largestInflow.net_cashflow_base, baseCurrency)
              : "No inflow"}
          </strong>
          {chartModel.largestInflow ? (
            <em>{formatDate(chartModel.largestInflow.projection_date)}</em>
          ) : null}
        </div>
        <div className="portfolio-cashflow-summary-stat">
          <span>Largest Outflow</span>
          <strong>
            {chartModel.largestOutflow
              ? formatCurrency(chartModel.largestOutflow.net_cashflow_base, baseCurrency)
              : "No outflow"}
          </strong>
          {chartModel.largestOutflow ? (
            <em>{formatDate(chartModel.largestOutflow.projection_date)}</em>
          ) : null}
        </div>
      </div>
      <div className="portfolio-cashflow-chart" hidden={!chartModel.chartPoints.length}>
        <svg
          viewBox="0 0 320 196"
          className="portfolio-timeseries-chart-svg"
          role="img"
          aria-label={`Projected cashflow chart in ${baseCurrency}`}
        >
          {[36, 68, 100, 132, 164].map((gridY) => (
            <line
              key={`grid-${gridY}`}
              x1="24"
              x2="296"
              y1={gridY}
              y2={gridY}
              className="portfolio-cashflow-grid-line"
            />
          ))}
          {chartModel.zeroLineY == null ? null : (
            <line
              x1="24"
              x2="296"
              y1={chartModel.zeroLineY}
              y2={chartModel.zeroLineY}
              className="portfolio-cashflow-zero-line"
            />
          )}
          {chartModel.flowBars.map((bar) => (
            <g key={`flow-${bar.projectionDate}`}>
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx="4"
                className={
                  bar.direction === "positive"
                    ? "portfolio-cashflow-flow-bar portfolio-cashflow-flow-bar-positive"
                    : "portfolio-cashflow-flow-bar portfolio-cashflow-flow-bar-negative"
                }
              >
                <title>{formatCashflowNetFlowTitle(bar.point, baseCurrency)}</title>
              </rect>
            </g>
          ))}
          <path d={chartModel.areaPath} className="portfolio-timeseries-chart-area" />
          <path d={chartModel.linePath} className="portfolio-timeseries-chart-line" />
          {chartModel.markerPoints.map(({ x, y, point }) => (
            <g key={point.projection_date}>
              <circle cx={x} cy={y} r="4" className="portfolio-timeseries-chart-point">
                <title>{formatCashflowPointTitle(point, baseCurrency)}</title>
              </circle>
            </g>
          ))}
          {chartModel.focusPoint ? (
            <g className="portfolio-cashflow-focus-callout" aria-hidden="true">
              <rect x={chartModel.focusX} y={chartModel.focusY} width="86" height="34" rx="2" />
              <circle cx={chartModel.focusX + 76} cy={chartModel.focusY + 8} r="2.4" />
              <text x={chartModel.focusX + 8} y={chartModel.focusY + 12}>
                {formatDate(chartModel.focusPoint.projection_date)}
              </text>
              <text x={chartModel.focusX + 8} y={chartModel.focusY + 24}>
                {formatCurrency(chartModel.focusPoint.net_cashflow_base, baseCurrency)}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
      <div
        className="portfolio-cashflow-forecast-mix"
        aria-label="Projected cashflow mix"
        hidden={!chartModel.chartPoints.length}
      >
        <span>{`${chartModel.positiveFlowCount} inflow${chartModel.positiveFlowCount === 1 ? "" : "s"}`}</span>
        <span>{`${chartModel.negativeFlowCount} outflow${chartModel.negativeFlowCount === 1 ? "" : "s"}`}</span>
        <span>{`Through ${formatDate(cashflowOutlook.range_end_date)}`}</span>
      </div>
    </div>
  );
}
