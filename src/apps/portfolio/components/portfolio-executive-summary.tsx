"use client";

import { ActionLink } from "@/design-system";

import { formatCurrency, formatDate, formatPct, formatStatus } from "../formatters";
import {
  buildPortfolioSummaryAttentionItems,
  buildPortfolioSummaryReadiness,
  formatProjectedCashflowPointTitle,
  getPortfolioSummaryValueToneClass,
  resolvePortfolioCashflowPointHeight,
  resolvePortfolioSummaryAllocationRows,
  resolvePortfolioSummaryTopHoldingRows,
} from "../portfolio-summary-view-model";
import type { PortfolioWorkspace } from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";

export default function PortfolioExecutiveSummary({
  workspace,
  context,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
}) {
  const isDetailedView = context.viewMode === "detailed";
  const allocationRows = isDetailedView
    ? []
    : resolvePortfolioSummaryAllocationRows(workspace).slice(0, 5);
  const totalAllocationWeight = allocationRows.reduce(
    (total, row) => total + Math.max(0, row.weight ?? 0),
    0
  );
  const topHoldingRows = isDetailedView
    ? []
    : resolvePortfolioSummaryTopHoldingRows(workspace).slice(0, 5);
  const cashflow = workspace.cashflow_outlook;
  const portfolioId = encodeURIComponent(workspace.portfolio.portfolio_id);
  const attentionItems = buildPortfolioSummaryAttentionItems(workspace);
  const readiness = buildPortfolioSummaryReadiness(workspace);

  return (
    <section
      className={`portfolio-executive-summary-grid${
        isDetailedView ? " portfolio-executive-summary-grid-detailed" : ""
      }`}
      aria-label={isDetailedView ? "Portfolio operating brief" : "Portfolio summary previews"}
    >
      <div className="portfolio-summary-kpi-strip" aria-label="Portfolio operating metrics">
        <div className="portfolio-summary-kpi">
          <span>Market Value</span>
          <strong>{formatCurrency(workspace.summary.market_value_base, workspace.portfolio.base_currency)}</strong>
          <small>{workspace.summary.position_count} source-backed positions</small>
        </div>
        <div className="portfolio-summary-kpi">
          <span>Net Return {formatStatus(workspace.performance?.period ?? context.periodLabel)}</span>
          <strong className={getPortfolioSummaryValueToneClass(workspace.performance?.return_pct)}>
            {formatPct(workspace.performance?.return_pct)}
          </strong>
          <small>
            {workspace.performance?.benchmark_code
              ? `Benchmark ${workspace.performance.benchmark_code}`
              : `Period ${context.periodLabel}`}
          </small>
        </div>
        <div className="portfolio-summary-kpi">
          <span>Risk Profile</span>
          <strong>{formatStatus(workspace.profile.risk_exposure)}</strong>
          <small>{formatStatus(workspace.profile.portfolio_type)} mandate</small>
        </div>
      </div>

      {isDetailedView ? null : (
        <div className="portfolio-summary-module portfolio-allocation-summary portfolio-summary-module-wide">
          <div className="portfolio-summary-module-header">
            <div>
              <h3>Asset Allocation</h3>
            </div>
            <span>Updated {formatDate(context.selectedAsOfDate)}</span>
          </div>
          {allocationRows.length ? (
            <div className="portfolio-allocation-summary-body">
              <div className="portfolio-allocation-stack" aria-label="Asset allocation by weight">
                {allocationRows.map((row, index) => (
                  <div
                    key={row.label}
                    className={`portfolio-allocation-stack-segment portfolio-allocation-stack-segment-${index % 5}`}
                    style={{
                      width: `${Math.max(2, Math.min(row.weight ?? 0, 100))}%`,
                      flexGrow: totalAllocationWeight > 100 ? 0 : Math.max(0, row.weight ?? 0),
                    }}
                    title={`${row.label}: ${formatPct(row.weight)}`}
                  />
                ))}
              </div>
              <div className="portfolio-allocation-legend">
                {allocationRows.map((row, index) => (
                  <div key={row.label} className="portfolio-allocation-legend-item">
                    <span className={`portfolio-allocation-dot portfolio-allocation-dot-${index % 5}`} />
                    <div>
                      <strong>{row.label}</strong>
                      <small>
                        {formatCurrency(row.value, workspace.portfolio.base_currency)} ({formatPct(row.weight)})
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="portfolio-summary-empty-copy">Allocation is unavailable for this portfolio.</p>
          )}
        </div>
      )}

      <div className="portfolio-summary-module portfolio-attention-summary">
        <div className="portfolio-summary-module-header">
          <div>
            <h3>Attention Items ({attentionItems.length})</h3>
          </div>
        </div>
        <div className="portfolio-attention-list">
          {attentionItems.length ? (
            attentionItems.map((item) => (
              <article key={item.title} className={`portfolio-attention-item portfolio-attention-${item.tone}`}>
                <div className="portfolio-attention-marker" aria-hidden="true">
                  {item.tone === "danger" ? "!" : "i"}
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))
          ) : (
            <p className="portfolio-summary-empty-copy">No source-backed attention items for the selected view.</p>
          )}
        </div>
      </div>

      {isDetailedView ? null : (
        <div className="portfolio-summary-module portfolio-top-holdings-summary portfolio-summary-module-wide">
          <div className="portfolio-summary-module-header">
            <div>
              <h3>Top Holdings</h3>
            </div>
            <ActionLink href={`/positions?portfolioId=${portfolioId}`}>View All Positions</ActionLink>
          </div>
          <table className="portfolio-summary-table">
            <thead>
              <tr>
                <th>Instrument</th>
                <th className="numeric">Weight</th>
                <th className="numeric">Value ({workspace.portfolio.base_currency})</th>
                <th className="numeric">Unrealized P&L</th>
              </tr>
            </thead>
            <tbody>
              {topHoldingRows.length ? (
                topHoldingRows.map((row) => (
                  <tr key={row.securityId}>
                    <td>
                      <strong>{row.instrument}</strong>
                      <span>
                        {row.securityId} · {row.assetClass}
                      </span>
                    </td>
                    <td className="numeric">{formatPct(row.weight)}</td>
                    <td className="numeric">{formatCurrency(row.marketValue, workspace.portfolio.base_currency)}</td>
                    <td className={`numeric ${getPortfolioSummaryValueToneClass(row.unrealizedPnl)}`}>
                      {formatCurrency(row.unrealizedPnl, workspace.portfolio.base_currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>Top holdings are unavailable for this portfolio.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="portfolio-summary-side-stack">
        <div className="portfolio-summary-module portfolio-liquidity-summary">
          <div className="portfolio-summary-module-header">
            <div>
              <h3>Cashflow Forecast</h3>
            </div>
            <ActionLink href={`/cashflow?portfolioId=${portfolioId}`}>View Details</ActionLink>
          </div>
          {cashflow ? (
            <>
              <div className="portfolio-liquidity-hero">
                <span>Next {cashflow.projection_days} days</span>
                <strong>{formatCurrency(cashflow.total_net_cashflow_base, workspace.portfolio.base_currency)}</strong>
              </div>
              <div className="portfolio-liquidity-points" aria-label="Projected cashflow points">
                {cashflow.upcoming_points.slice(0, 10).map((point) => (
                  <div
                    key={point.projection_date}
                    title={formatProjectedCashflowPointTitle(point, workspace.portfolio.base_currency)}
                    className={point.net_cashflow_base < 0 ? "portfolio-liquidity-point-negative" : ""}
                    style={{ height: `${resolvePortfolioCashflowPointHeight(point.net_cashflow_base, cashflow)}%` }}
                  />
                ))}
              </div>
              <div className="portfolio-liquidity-axis">
                <span>Today</span>
                <span>{formatDate(cashflow.range_end_date)}</span>
              </div>
            </>
          ) : (
            <p className="portfolio-summary-empty-copy">Projected cashflow is unavailable.</p>
          )}
        </div>

        <div className="portfolio-summary-module portfolio-health-summary">
          <div>
            <span>Portfolio Health</span>
            <strong>{readiness.percentLabel}</strong>
          </div>
          <div className="portfolio-health-meter" aria-label={`Portfolio health ${readiness.percentLabel}`}>
            <div style={{ width: readiness.percentLabel }} />
          </div>
          <p>{readiness.readyCount} of {readiness.totalCount} readiness domains ready</p>
        </div>
      </div>
    </section>
  );
}
