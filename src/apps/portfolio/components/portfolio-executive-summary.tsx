"use client";

import { formatCurrency, formatDate, formatPct, formatStatus } from "../formatters";
import {
  buildPortfolioSummaryAttentionItems,
  buildPortfolioSummaryReadiness,
  resolvePortfolioPerformancePeriodReturns,
} from "../portfolio-summary-view-model";
import type { PortfolioWorkspace } from "../types";

export default function PortfolioExecutiveSummary({
  workspace,
}: {
  workspace: PortfolioWorkspace;
}) {
  const attentionItems = buildPortfolioSummaryAttentionItems(workspace);
  const readiness = buildPortfolioSummaryReadiness(workspace);
  const periodReturns = resolvePortfolioPerformancePeriodReturns(workspace);
  const ytdReturn = periodReturns.find((item) => item.period === "YTD");
  const nextAction = workspace.workflow_actions?.find((action) => action.recommended) ?? workspace.workflow_actions?.[0];
  const exceptionCount = workspace.partial_failures.length + (workspace.exception_summaries?.length ?? 0);
  const briefRows = [
    {
      label: "Book readiness",
      value: readiness.percentLabel,
      support: `${readiness.readyCount} of ${readiness.totalCount} checks ready`,
    },
    {
      label: "Client-use blockers",
      value: exceptionCount ? `${exceptionCount} open` : "Clear",
      support: exceptionCount ? "Resolve before client-ready use" : "No open reporting blockers",
    },
    {
      label: "Liquidity horizon",
      value: workspace.cashflow_outlook
        ? formatCurrency(workspace.cashflow_outlook.total_net_cashflow_base, workspace.portfolio.base_currency)
        : "Unavailable",
      support: workspace.cashflow_outlook
        ? `Projected to ${formatDate(workspace.cashflow_outlook.range_end_date)}`
        : "Open Cashflow for full liquidity path",
    },
    {
      label: "YTD return",
      value: ytdReturn?.returnPct == null ? "N/A" : formatPct(ytdReturn.returnPct),
      support: "Performance record",
    },
    {
      label: "Mandate workflow",
      value: workspace.rebalance?.status ? formatStatus(workspace.rebalance.status) : "No active run",
      support: workspace.rebalance?.status ? "Mandate review available" : "No current mandate action",
    },
    {
      label: "Next action",
      value: nextAction?.title ?? "Review book",
      support: nextAction?.impact?.split(".")[0] ?? "Start with attention items and readiness",
    },
  ];

  return (
    <section
      className="portfolio-executive-summary-grid portfolio-executive-summary-grid-focused"
      aria-label="Portfolio decision review"
    >
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
            <p className="portfolio-summary-empty-copy">No priority attention items for the selected view.</p>
          )}
        </div>
      </div>

      <div className="portfolio-summary-module portfolio-health-summary">
        <div>
          <span>Review Readiness</span>
          <strong>{readiness.percentLabel}</strong>
        </div>
        <div className="portfolio-health-meter" aria-label={`Review readiness ${readiness.percentLabel}`}>
          <div style={{ width: readiness.percentLabel }} />
        </div>
        <p>
          {readiness.readyCount} of {readiness.totalCount} book checks ready · {formatStatus(workspace.profile.risk_exposure)} risk profile
        </p>
      </div>

      <div className="portfolio-summary-module portfolio-operating-brief">
        <div className="portfolio-summary-module-header">
          <div>
            <span>Decision Brief</span>
            <h3>What to review next</h3>
          </div>
        </div>
        <div className="portfolio-operating-brief-grid">
          {briefRows.map((row) => (
            <div key={row.label} className="portfolio-operating-brief-row">
              <span>{row.label}</span>
              <strong>{row.value}</strong>
              <small>{row.support}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
