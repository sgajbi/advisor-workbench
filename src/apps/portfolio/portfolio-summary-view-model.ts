import { formatCurrency, formatDate, formatPct, formatStatus } from "./formatters";
import type { PortfolioWorkspace } from "./types";
import {
  buildPortfolioReadinessIndicators,
  getBookReadinessStatus,
  getBookReadinessSupport,
} from "./view-model";

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

export type PortfolioSummaryAttentionItem = {
  title: string;
  detail: string;
  tone: "danger" | "warn" | "neutral";
};

export type PortfolioSummaryReadiness = {
  readyCount: number;
  totalCount: number;
  percentLabel: string;
};

export type PortfolioDecisionBriefRow = {
  label: string;
  value: string;
  support: string;
};

export type PortfolioDecisionBrief = {
  headline: string;
  support: string;
  readiness: PortfolioSummaryReadiness;
  rows: PortfolioDecisionBriefRow[];
  attentionItems: PortfolioSummaryAttentionItem[];
};

export type PortfolioPerformancePeriodReturn = {
  period: "MTD" | "QTD" | "YTD";
  returnPct: number | null;
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

export function buildPortfolioSummaryAttentionItems(
  workspace: PortfolioWorkspace
): PortfolioSummaryAttentionItem[] {
  const items: PortfolioSummaryAttentionItem[] = [];

  for (const exception of workspace.exception_summaries ?? []) {
    items.push({
      title: exception.title,
      detail: exception.detail,
      tone: exception.tone === "danger" ? "danger" : exception.tone === "warn" ? "warn" : "neutral",
    });
  }

  if (workspace.summary.cash_weight_pct > 5) {
    items.push({
      title: "Cash Review Needed",
      detail: `${formatPct(workspace.summary.cash_weight_pct)} cash exceeds the 5% review threshold for this portfolio review.`,
      tone: "warn",
    });
  }

  if (workspace.partial_failures.length) {
    const firstFailure = workspace.partial_failures[0];
    items.push({
      title: "Reporting Coverage Gap",
      detail: firstFailure.detail,
      tone: "warn",
    });
  }

  for (const insight of workspace.insights ?? []) {
    items.push({
      title: insight.title,
      detail: insight.detail,
      tone: insight.severity === "critical" ? "danger" : insight.severity === "warning" ? "warn" : "neutral",
    });
  }

  return items.slice(0, 2);
}

export function buildPortfolioSummaryReadiness(
  workspace: PortfolioWorkspace
): PortfolioSummaryReadiness {
  const indicators = workspace.readiness_indicators ?? buildPortfolioReadinessIndicators(workspace);
  const totalCount = Math.max(1, indicators.length);
  const readyCount = indicators.filter((indicator) => indicator.status === "Ready").length;
  const percent = Math.round((readyCount / totalCount) * 100);

  return {
    readyCount,
    totalCount,
    percentLabel: `${percent}%`,
  };
}

export function buildPortfolioDecisionBrief(workspace: PortfolioWorkspace): PortfolioDecisionBrief {
  const attentionItems = buildPortfolioSummaryAttentionItems(workspace);
  const readiness = buildPortfolioSummaryReadiness(workspace);
  const exceptionCount = workspace.partial_failures.length + (workspace.exception_summaries?.length ?? 0);
  const nextAction = workspace.workflow_actions?.find((action) => action.recommended) ?? workspace.workflow_actions?.[0];
  const primaryAttention = attentionItems[0];

  return {
    headline: primaryAttention ? "Review priority attention" : nextAction?.title ?? "Book ready for portfolio review",
    support:
      primaryAttention?.detail ??
      nextAction?.impact?.split(".")[0] ??
      "Start with readiness, blockers, and the recommended front-office action.",
    readiness,
    attentionItems,
    rows: [
      {
        label: "Review readiness",
        value: getBookReadinessStatus(workspace),
        support: getBookReadinessSupport(workspace),
      },
      {
        label: "Client-use blockers",
        value: exceptionCount ? `${exceptionCount} open` : "Clear",
        support: exceptionCount ? "Resolve before client-ready use" : "No open reporting blockers",
      },
      {
        label: "Next action",
        value: nextAction?.title ?? "Review book",
        support: nextAction?.impact?.split(".")[0] ?? "Use the active workflow links for drill-down.",
      },
    ],
  };
}

export function resolvePortfolioPerformancePeriodReturns(
  workspace: PortfolioWorkspace
): PortfolioPerformancePeriodReturn[] {
  const sourceRows = new Map(
    (workspace.performance_period_returns ?? []).map((row) => [row.period, row.return_pct])
  );

  if (
    workspace.performance?.period &&
    ["MTD", "QTD", "YTD"].includes(workspace.performance.period)
  ) {
    sourceRows.set(workspace.performance.period as "MTD" | "QTD" | "YTD", workspace.performance.return_pct);
  }

  return ["MTD", "QTD", "YTD"].map((period) => ({
    period: period as "MTD" | "QTD" | "YTD",
    returnPct: sourceRows.get(period as "MTD" | "QTD" | "YTD") ?? null,
  }));
}

export function formatProjectedCashflowPointTitle(
  point: NonNullable<PortfolioWorkspace["cashflow_outlook"]>["upcoming_points"][number],
  currency: string
) {
  return `${formatDate(point.projection_date)} ${formatCurrency(point.net_cashflow_base, currency)}`;
}
