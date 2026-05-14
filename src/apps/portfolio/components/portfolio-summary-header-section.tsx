"use client";

import { ActionLink, Panel, SemanticBadge, Text } from "@/design-system";

import { formatBookingCenter, formatCount, formatCurrency, formatDate, formatPct, formatStatus } from "../formatters";
import type { PortfolioWorkspace } from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";
import {
  buildPortfolioReadinessIndicators,
  getBookReadinessSupport,
  getInvestedAssetWeight,
  getRequestedWindowActivityCount,
} from "../view-model";
import PortfolioHealthStrip from "../modules/portfolio-health/portfolio-health-strip";
import PortfolioInsightsStrip from "../modules/portfolio-insights/portfolio-insights-strip";
import type { PortfolioMetricDrawerKey } from "./portfolio-detail-drawer-builders";

export default function PortfolioSummaryHeaderSection({
  workspace,
  context,
  orderedWorkflowCues,
  primaryWorkflowCueKey,
  readinessIndicators,
  onOpenMetricDrawer,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  orderedWorkflowCues: Array<{ key: string; label: string; href: string }>;
  primaryWorkflowCueKey: string | null;
  readinessIndicators: ReturnType<typeof buildPortfolioReadinessIndicators>;
  onOpenMetricDrawer: (metric: PortfolioMetricDrawerKey) => void;
}) {
  return (
    <section
      id="portfolio-summary"
      className="portfolio-workspace-section portfolio-summary-cluster-section portfolio-summary-cluster-hero"
    >
      <Panel className="portfolio-hero portfolio-book-hero portfolio-operating-header">
        <div className="portfolio-hero-header">
          <div className="portfolio-hero-content">
            <Text variant="label" className="portfolio-hero-label">
              Portfolio / {workspace.portfolio.portfolio_id}
            </Text>
            <h2>{workspace.portfolio.display_name}</h2>
            <div className="portfolio-hero-meta">
              <span>{workspace.portfolio.base_currency}</span>
              {workspace.portfolio.client_id ? <span>{workspace.portfolio.client_id}</span> : null}
              {workspace.portfolio.booking_center_code ? (
                <span>{formatBookingCenter(workspace.portfolio.booking_center_code)}</span>
              ) : null}
              {workspace.performance?.benchmark_code ? (
                <span>{workspace.performance.benchmark_code}</span>
              ) : null}
              <span>As of {formatDate(context.selectedAsOfDate)}</span>
              {workspace.profile.status ? (
                <SemanticBadge className="portfolio-hero-status">
                  {formatStatus(workspace.profile.status)}
                </SemanticBadge>
              ) : null}
            </div>
          </div>
          <div className="portfolio-hero-actions portfolio-hero-toolbar">
            {orderedWorkflowCues.map((cue) => (
              <ActionLink
                key={cue.key}
                href={cue.href}
                className={
                  cue.key === primaryWorkflowCueKey
                    ? "portfolio-action-link portfolio-action-link-primary"
                    : "portfolio-action-link portfolio-action-link-secondary"
                }
              >
                {cue.label}
              </ActionLink>
            ))}
          </div>
        </div>

        <PortfolioHealthStrip
          tiles={[
            {
              key: "aum",
              label: "AUM",
              value: formatCurrency(workspace.summary.market_value_base, workspace.portfolio.base_currency),
              definition:
                "Total portfolio market value in the portfolio base currency as of the selected date.",
              support: `As of ${formatDate(context.selectedAsOfDate)}`,
              onClick: () => onOpenMetricDrawer("aum"),
            },
            {
              key: "invested_assets",
              label: "Invested Assets",
              value: formatCurrency(
                workspace.summary.invested_market_value_base,
                workspace.portfolio.base_currency
              ),
              definition:
                "Market value currently invested in funded holdings, excluding operational cash inventory.",
              support: `${formatPct(getInvestedAssetWeight(workspace))} of AUM`,
              onClick: () => onOpenMetricDrawer("invested_assets"),
            },
            {
              key: "available_cash",
              label: "Cash",
              value: formatCurrency(workspace.summary.total_cash_base, workspace.portfolio.base_currency),
              definition:
                "Available cash inventory in the portfolio base currency across published cash balances.",
              support: `${formatPct(workspace.summary.cash_weight_pct)} cash allocation`,
              onClick: () => onOpenMetricDrawer("available_cash"),
            },
            {
              key: "cash_accounts",
              label: "Cash Accounts",
              value: workspace.summary.cash_balance_count ?? 0,
              definition: "Number of published cash balance accounts in the current portfolio book.",
              support: formatCount(workspace.summary.cash_balance_count ?? 0, "cash account"),
            },
          ]}
        />
        <Text variant="metadata" className="portfolio-hero-support">
          {getBookReadinessSupport(workspace)}
        </Text>
        <Text variant="metadata" className="portfolio-hero-support">
          {getRequestedWindowActivityCount(workspace)} booked events
        </Text>
      </Panel>

      <PortfolioInsightsStrip
        insights={[]}
        readinessIndicators={readinessIndicators}
        onDismissInsight={() => undefined}
      />
    </section>
  );
}
