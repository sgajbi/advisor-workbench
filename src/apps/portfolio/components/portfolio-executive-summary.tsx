"use client";

import { ActionLink } from "@/design-system";

import { formatCurrency, formatDate, formatPct, formatStatus } from "../formatters";
import {
  buildPortfolioAdvisorGuidanceItems,
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
  const allocationRows = resolvePortfolioSummaryAllocationRows(workspace).slice(0, 5);
  const topHoldingRows = resolvePortfolioSummaryTopHoldingRows(workspace).slice(0, 4);
  const recentTransactions = workspace.recent_transactions.slice(0, 3);
  const cashflow = workspace.cashflow_outlook;
  const portfolioId = encodeURIComponent(workspace.portfolio.portfolio_id);

  return (
    <section className="portfolio-executive-summary-grid" aria-label="Portfolio summary previews">
      <div className="portfolio-summary-module portfolio-allocation-summary">
        <div className="portfolio-summary-module-header">
          <div>
            <span>Composition</span>
            <h3>Asset Allocation</h3>
          </div>
          <ActionLink href={`/positions?portfolioId=${portfolioId}`}>Open Positions</ActionLink>
        </div>
        <div className="portfolio-allocation-bar-list">
          {allocationRows.length ? (
            allocationRows.map((row) => (
              <div key={row.label} className="portfolio-allocation-bar-row">
                <span>{row.label}</span>
                <div className="portfolio-allocation-track" aria-hidden="true">
                  <div style={{ width: `${Math.max(0, Math.min(row.weight ?? 0, 100))}%` }} />
                </div>
                <strong>{formatPct(row.weight)}</strong>
              </div>
            ))
          ) : (
            <p className="portfolio-summary-empty-copy">Allocation is unavailable for this portfolio.</p>
          )}
        </div>
      </div>

      <div className="portfolio-summary-module portfolio-top-holdings-summary">
        <div className="portfolio-summary-module-header">
          <div>
            <span>Inventory</span>
            <h3>Top Holdings</h3>
          </div>
          <ActionLink href={`/positions?portfolioId=${portfolioId}`}>View All</ActionLink>
        </div>
        <table className="portfolio-summary-table">
          <thead>
            <tr>
              <th>Instrument</th>
              <th className="numeric">Market Value</th>
              <th className="numeric">Weight</th>
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
                  <td className="numeric">{formatCurrency(row.marketValue, workspace.portfolio.base_currency)}</td>
                  <td className="numeric">{formatPct(row.weight)}</td>
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

      <div className="portfolio-summary-module portfolio-activity-summary">
        <div className="portfolio-summary-module-header">
          <div>
            <span>Activity</span>
            <h3>Recent Transactions</h3>
          </div>
          <ActionLink href={`/transactions?portfolioId=${portfolioId}`}>Open Ledger</ActionLink>
        </div>
        <div className="portfolio-activity-list">
          {recentTransactions.length ? (
            recentTransactions.map((transaction) => (
              <div key={transaction.transaction_id} className="portfolio-activity-row">
                <div>
                  <strong>{formatStatus(transaction.transaction_type)}</strong>
                  <span>
                    {formatDate(transaction.transaction_date)} · {transaction.instrument_id}
                  </span>
                </div>
                <div>
                  <strong>
                    {formatCurrency(
                      transaction.net_cost_base ?? transaction.gross_amount,
                      transaction.currency ?? workspace.portfolio.base_currency
                    )}
                  </strong>
                  <span>{formatStatus(transaction.settlement_status)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="portfolio-summary-empty-copy">
              No recent transactions in the {context.periodLabel} window.
            </p>
          )}
        </div>
      </div>

      <div className="portfolio-summary-module portfolio-liquidity-summary">
        <div className="portfolio-summary-module-header">
          <div>
            <span>Liquidity</span>
            <h3>Forward Cashflow</h3>
          </div>
          <ActionLink href={`/cashflow?portfolioId=${portfolioId}`}>Open Cashflow</ActionLink>
        </div>
        {cashflow ? (
          <>
            <div className="portfolio-liquidity-kpis">
              <div>
                <span>Net Flow</span>
                <strong>{formatCurrency(cashflow.total_net_cashflow_base, workspace.portfolio.base_currency)}</strong>
              </div>
              <div>
                <span>Horizon</span>
                <strong>{cashflow.projection_days}D</strong>
              </div>
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

      <PortfolioAdvisorGuidanceSummary workspace={workspace} />
    </section>
  );
}

function PortfolioAdvisorGuidanceSummary({ workspace }: { workspace: PortfolioWorkspace }) {
  const guidanceItems = buildPortfolioAdvisorGuidanceItems(workspace);
  const portfolioId = encodeURIComponent(workspace.portfolio.portfolio_id);

  return (
    <div className="portfolio-summary-module portfolio-advisor-guidance-summary">
      <div className="portfolio-summary-module-header">
        <div>
          <span>Guidance</span>
          <h3>Advisor Guidance</h3>
        </div>
        <ActionLink href={`/recommendations?portfolioId=${portfolioId}`}>Advisory</ActionLink>
      </div>
      <div className="portfolio-advisor-guidance-list">
        {guidanceItems.map((item) => (
          <article key={item.title} className={`portfolio-advisor-guidance-item portfolio-advisor-guidance-${item.tone}`}>
            <div className="portfolio-advisor-guidance-item-header">
              <strong>{item.title}</strong>
              <span>{item.priority}</span>
            </div>
            <p>{item.body}</p>
            <ActionLink href={item.href}>{item.action}</ActionLink>
          </article>
        ))}
      </div>
    </div>
  );
}
