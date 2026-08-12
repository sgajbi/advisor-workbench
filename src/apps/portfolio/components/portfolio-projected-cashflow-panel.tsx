"use client";

import { formatCurrency, formatDate } from "../formatters";
import {
  buildProjectedCashflowChartModel,
  formatCashflowNetFlowTitle,
  formatCashflowPointTitle,
} from "../portfolio-chart-view-model";
import type { PortfolioWorkspace } from "../types";
import styles from "./portfolio-projected-cashflow.module.css";

export default function PortfolioProjectedCashflowPanel({
  cashflowOutlook,
  baseCurrency,
}: {
  cashflowOutlook: NonNullable<PortfolioWorkspace["cashflow_outlook"]>;
  baseCurrency: string;
}) {
  const chartModel = buildProjectedCashflowChartModel(cashflowOutlook);
  const aggregateOnlyMovement =
    chartModel.chartPoints.length === 0 &&
    cashflowOutlook.total_net_cashflow_base !== 0;

  return (
    <div
      className={
        chartModel.flatCashflow
          ? `portfolio-chart-card ${styles.card} ${styles.flatCard}`
          : `portfolio-chart-card ${styles.card}`
      }
    >
      <div
        className={styles.summaryStrip}
        aria-label="Projected cash movement summary"
      >
        <div className={styles.summaryStat}>
          <span>Net Projected Movement</span>
          <strong>
            {formatCurrency(
              cashflowOutlook.total_net_cashflow_base,
              baseCurrency,
            )}
          </strong>
        </div>
        <div className={styles.summaryStat}>
          <span>Projected Inflows</span>
          <strong>
            {aggregateOnlyMovement
              ? "Dated detail unavailable"
              : formatCurrency(chartModel.totalInflows, baseCurrency)}
          </strong>
        </div>
        <div className={styles.summaryStat}>
          <span>Projected Outflows</span>
          <strong>
            {aggregateOnlyMovement
              ? "Dated detail unavailable"
              : formatCurrency(chartModel.totalOutflows, baseCurrency)}
          </strong>
        </div>
        <div className={styles.summaryStat}>
          <span>Largest Outflow</span>
          <strong>
            {chartModel.largestOutflow
              ? formatCurrency(
                  chartModel.largestOutflow.net_cashflow_base,
                  baseCurrency,
                )
              : aggregateOnlyMovement
                ? "Dated detail unavailable"
                : "No outflow"}
          </strong>
          {chartModel.largestOutflow ? (
            <em>{formatDate(chartModel.largestOutflow.projection_date)}</em>
          ) : null}
        </div>
      </div>
      <div className={styles.chartLegend} aria-label="Cash movement chart key">
        <span>
          <span className={styles.movementSwatches} aria-hidden="true">
            <span className={styles.inflowSwatch} />
            <span className={styles.outflowSwatch} />
          </span>
          Bars: dated movement
        </span>
        <span>
          <span className={styles.cumulativeSwatch} aria-hidden="true" />
          Line: cumulative movement
        </span>
      </div>
      <div className={styles.chart} hidden={!chartModel.chartPoints.length}>
        <svg
          viewBox="0 0 320 196"
          className="portfolio-timeseries-chart-svg"
          role="img"
          aria-label={`Projected cash movement chart in ${baseCurrency}; bars show dated movement and the line shows cumulative movement`}
        >
          {[36, 68, 100, 132, 164].map((gridY) => (
            <line
              key={`grid-${gridY}`}
              x1="24"
              x2="296"
              y1={gridY}
              y2={gridY}
              className={styles.gridLine}
            />
          ))}
          {chartModel.zeroLineY == null ? null : (
            <line
              x1="24"
              x2="296"
              y1={chartModel.zeroLineY}
              y2={chartModel.zeroLineY}
              className={styles.zeroLine}
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
                    ? `${styles.flowBar} ${styles.flowBarPositive}`
                    : `${styles.flowBar} ${styles.flowBarNegative}`
                }
              >
                <title>
                  {formatCashflowNetFlowTitle(bar.point, baseCurrency)}
                </title>
              </rect>
            </g>
          ))}
          <path
            d={chartModel.areaPath}
            className="portfolio-timeseries-chart-area"
          />
          <path
            d={chartModel.linePath}
            className="portfolio-timeseries-chart-line"
          />
          {chartModel.markerPoints.map(({ x, y, point }) => (
            <g key={point.projection_date}>
              <circle
                cx={x}
                cy={y}
                r="4"
                className="portfolio-timeseries-chart-point"
              >
                <title>{formatCashflowPointTitle(point, baseCurrency)}</title>
              </circle>
            </g>
          ))}
          {chartModel.focusPoint ? (
            <g className={styles.focusCallout} aria-hidden="true">
              <rect
                x={chartModel.focusX}
                y={chartModel.focusY}
                width="86"
                height="34"
                rx="2"
              />
              <circle
                cx={chartModel.focusX + 76}
                cy={chartModel.focusY + 8}
                r="2.4"
              />
              <text x={chartModel.focusX + 8} y={chartModel.focusY + 12}>
                {formatDate(chartModel.focusPoint.projection_date)}
              </text>
              <text x={chartModel.focusX + 8} y={chartModel.focusY + 24}>
                {formatCurrency(
                  chartModel.focusPoint.net_cashflow_base,
                  baseCurrency,
                )}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
      <div
        className={styles.forecastMix}
        aria-label="Projected cash movement mix"
        hidden={!chartModel.chartPoints.length}
      >
        <span>{`${chartModel.positiveFlowCount} inflow${chartModel.positiveFlowCount === 1 ? "" : "s"}`}</span>
        <span>{`${chartModel.negativeFlowCount} outflow${chartModel.negativeFlowCount === 1 ? "" : "s"}`}</span>
        <span>{`Through ${formatDate(cashflowOutlook.range_end_date)}`}</span>
      </div>
    </div>
  );
}
