import { formatCurrency, formatDate, formatPct, formatStatus } from "./formatters";
import type { PortfolioWorkspace } from "./types";

export type PortfolioSummaryAllocationRow = {
  label: string;
  weight: number | null;
  value: number | null;
};

export type PortfolioSummaryHoldingRow = {
  securityId: string;
  instrument: string;
  assetClass: string;
  marketValue: number | null;
  weight: number | null;
  unrealizedPnl: number | null;
};

export type PortfolioAdvisorGuidanceItem = {
  title: string;
  priority: string;
  body: string;
  action: string;
  href: string;
  tone: "success" | "warn" | "neutral";
};

export function resolvePortfolioSummaryAllocationRows(
  workspace: PortfolioWorkspace
): PortfolioSummaryAllocationRow[] {
  if (workspace.allocations.length) {
    return workspace.allocations.map((row) => ({
      label: formatStatus(row.asset_class),
      weight: row.weight_pct,
      value: row.market_value_base,
    }));
  }

  const allocationView =
    workspace.allocation_views?.find((view) => view.dimension === "asset_class") ??
    workspace.allocation_views?.[0];

  return (allocationView?.buckets ?? []).map((row) => ({
    label: formatStatus(row.bucket),
    weight: row.weight_pct,
    value: row.market_value_base,
  }));
}

export function resolvePortfolioSummaryTopHoldingRows(
  workspace: PortfolioWorkspace
): PortfolioSummaryHoldingRow[] {
  const positionBySecurityId = new Map(
    workspace.positions.map((position) => [position.security_id, position])
  );
  const sourceRows = workspace.top_positions.length
    ? workspace.top_positions
    : workspace.positions
        .slice()
        .sort((left, right) => (right.weight_pct ?? 0) - (left.weight_pct ?? 0))
        .slice(0, 5)
        .map((position) => ({
          security_id: position.security_id,
          instrument_name: position.instrument_name,
          asset_class: position.asset_class,
          quantity: position.quantity,
          market_value_base: position.market_value_base,
          weight_pct: position.weight_pct,
        }));

  return sourceRows.map((row) => {
    const position = positionBySecurityId.get(row.security_id);
    return {
      securityId: row.security_id,
      instrument: row.instrument_name,
      assetClass: formatStatus(row.asset_class),
      marketValue: row.market_value_base,
      weight: row.weight_pct,
      unrealizedPnl: position?.unrealized_gain_loss_base ?? null,
    };
  });
}

export function getPortfolioSummaryValueToneClass(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "";
  }
  if (value > 0) {
    return "portfolio-summary-value-positive";
  }
  if (value < 0) {
    return "portfolio-summary-value-negative";
  }
  return "";
}

export function resolvePortfolioCashflowPointHeight(
  value: number,
  cashflow: NonNullable<PortfolioWorkspace["cashflow_outlook"]>
) {
  const maxMagnitude = Math.max(
    1,
    ...cashflow.upcoming_points.map((point) => Math.abs(point.net_cashflow_base))
  );
  return 18 + (Math.abs(value) / maxMagnitude) * 72;
}

export function buildPortfolioAdvisorGuidanceItems(
  workspace: PortfolioWorkspace
): PortfolioAdvisorGuidanceItem[] {
  const portfolioId = encodeURIComponent(workspace.portfolio.portfolio_id);
  const exceptionCount =
    workspace.partial_failures.length + (workspace.exception_summaries?.length ?? 0);
  const firstWorkflowAction = workspace.workflow_actions?.[0];
  const firstInsight = workspace.insights?.[0];
  const items: PortfolioAdvisorGuidanceItem[] = [];

  if (exceptionCount) {
    items.push({
      title: "Resolve Readiness Gaps",
      priority: "High priority",
      body: `${exceptionCount} source-backed exception${exceptionCount === 1 ? "" : "s"} should be reviewed before client-facing use.`,
      action: "Review Exceptions",
      href: `/portfolio?portfolioId=${portfolioId}`,
      tone: "warn",
    });
  } else {
    items.push({
      title: "Ready For Client Review",
      priority: "Ready",
      body: "Holdings, transactions, reporting, and readiness checks are usable for advisor review.",
      action: "Open Evidence",
      href: `/portfolio?portfolioId=${portfolioId}`,
      tone: "success",
    });
  }

  if (workspace.summary.cash_weight_pct > 5) {
    items.push({
      title: "Review Cash Deployment",
      priority: "Review",
      body: `${formatPct(workspace.summary.cash_weight_pct)} cash allocation may warrant deployment or liquidity confirmation against mandate.`,
      action: "Open Cashflow",
      href: `/cashflow?portfolioId=${portfolioId}`,
      tone: "warn",
    });
  } else {
    items.push({
      title: "Liquidity In Range",
      priority: "Monitor",
      body: `${formatPct(workspace.summary.cash_weight_pct)} cash allocation is visible with forward cashflow context.`,
      action: "Open Cashflow",
      href: `/cashflow?portfolioId=${portfolioId}`,
      tone: "neutral",
    });
  }

  if (workspace.rebalance?.status) {
    items.push({
      title: "DPM Operation Available",
      priority: formatStatus(workspace.rebalance.status),
      body: workspace.rebalance.last_rebalance_run_id
        ? `Latest rebalance run ${workspace.rebalance.last_rebalance_run_id} is available for operational review.`
        : "A DPM operation state is available for mandate and rebalance review.",
      action: "Open Manage",
      href: `/workbench/${portfolioId}`,
      tone: "neutral",
    });
  } else if (firstWorkflowAction) {
    items.push({
      title: firstWorkflowAction.title,
      priority: firstWorkflowAction.recommended ? "Recommended" : "Next action",
      body: firstWorkflowAction.impact,
      action: firstWorkflowAction.cta_label,
      href: firstWorkflowAction.href,
      tone: firstWorkflowAction.recommended ? "warn" : "neutral",
    });
  } else if (firstInsight) {
    items.push({
      title: firstInsight.title,
      priority: formatStatus(firstInsight.severity),
      body: firstInsight.detail,
      action: "Review Insight",
      href: firstInsight.href,
      tone: firstInsight.severity === "critical" || firstInsight.severity === "warning" ? "warn" : "neutral",
    });
  }

  return items.slice(0, 3);
}

export function formatProjectedCashflowPointTitle(
  point: NonNullable<PortfolioWorkspace["cashflow_outlook"]>["upcoming_points"][number],
  currency: string
) {
  return `${formatDate(point.projection_date)} ${formatCurrency(point.net_cashflow_base, currency)}`;
}
