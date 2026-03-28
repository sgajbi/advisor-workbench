import type { PortfolioCatalogResponse, PortfolioWorkspace } from "./types";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";

type PortfolioWorkspaceSummaryResponse = {
  as_of_date: string;
  portfolio: PortfolioWorkspace["portfolio"];
  profile: PortfolioWorkspace["profile"];
  summary: {
    assets_under_management_base: number;
    invested_market_value_base: number;
    cash_market_value_base: number;
    cash_weight_pct: number;
    position_count: number;
    cash_balance_count: number;
  };
  cashflow_outlook: PortfolioWorkspace["cashflow_outlook"];
  reporting: PortfolioWorkspace["readiness"]["reporting"];
  operations?: Record<string, unknown> | null;
  workflow_cues: PortfolioWorkspace["workflow_cues"];
  warnings: string[];
  partial_failures: PortfolioWorkspace["partial_failures"];
};

type PortfolioPositionsResponse = {
  top_positions: PortfolioWorkspace["top_positions"];
  positions: PortfolioWorkspace["positions"];
};

type PortfolioLiquidityResponse = {
  cash_balances: NonNullable<PortfolioWorkspace["cash_balances"]>;
  cashflow_outlook: PortfolioWorkspace["cashflow_outlook"];
};

type PortfolioAllocationResponse = {
  views: Array<{
    dimension: string;
    buckets: Array<{
      bucket: string;
      position_count: number;
      market_value_base: number | null;
      weight_pct: number | null;
    }>;
  }>;
};

type PortfolioTransactionLedgerResponse = {
  transactions: PortfolioWorkspace["recent_transactions"];
};

type PortfolioIncomeSummaryResponse = NonNullable<PortfolioWorkspace["income_summary"]>;

type PortfolioActivitySummaryResponse = NonNullable<PortfolioWorkspace["activity_summary"]>;

type PortfolioReadinessResponse = {
  indicators: NonNullable<PortfolioWorkspace["readiness_indicators"]>;
};

type PortfolioWorkflowResponse = {
  actions: NonNullable<PortfolioWorkspace["workflow_actions"]>;
};

type PortfolioWorkspaceDetails = Pick<
  PortfolioWorkspace,
  | "allocations"
  | "allocation_views"
  | "cash_balances"
  | "top_positions"
  | "positions"
  | "recent_transactions"
  | "income_summary"
  | "activity_summary"
  | "cashflow_outlook"
  | "readiness_indicators"
  | "workflow_actions"
>;

export async function getPortfolioCatalog(): Promise<PortfolioCatalogResponse["items"]> {
  try {
    const response = await fetch(`${resolveBffBaseUrl()}/api/v1/portfolio/portfolios`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as PortfolioCatalogResponse;
    return payload.items ?? [];
  } catch {
    return [];
  }
}

export async function getPortfolioWorkspaceShell(
  portfolioId: string
): Promise<PortfolioWorkspace | null> {
  try {
    const baseUrl = resolveBffBaseUrl();
    const summaryResponse = await fetch(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/workspace`,
      { cache: "no-store" }
    );
    if (!summaryResponse.ok) {
      return null;
    }

    const summaryPayload =
      (await summaryResponse.json()) as PortfolioWorkspaceSummaryResponse;

    return {
      as_of_date: summaryPayload.as_of_date,
      portfolio: summaryPayload.portfolio,
      profile: summaryPayload.profile,
      summary: {
        market_value_base: summaryPayload.summary.assets_under_management_base,
        invested_market_value_base: summaryPayload.summary.invested_market_value_base,
        total_cash_base: summaryPayload.summary.cash_market_value_base,
        cash_weight_pct: summaryPayload.summary.cash_weight_pct,
        position_count: summaryPayload.summary.position_count,
        cash_balance_count: summaryPayload.summary.cash_balance_count,
      },
      allocations: [],
      allocation_views: [],
      cash_balances: [],
      top_positions: [],
      positions: [],
      recent_transactions: [],
      income_summary: null,
      activity_summary: null,
      cashflow_outlook: summaryPayload.cashflow_outlook,
      performance: null,
      rebalance: null,
      readiness: {
        has_positions: summaryPayload.summary.position_count > 0,
        reporting: summaryPayload.reporting,
      },
      readiness_indicators: undefined,
      workflow_cues: summaryPayload.workflow_cues,
      workflow_actions: undefined,
      warnings: summaryPayload.warnings,
      partial_failures: summaryPayload.partial_failures,
      operations: summaryPayload.operations ?? null,
    };
  } catch {
    return null;
  }
}

export async function getPortfolioWorkspaceDetails(
  portfolioId: string
): Promise<PortfolioWorkspaceDetails | null> {
  try {
    const baseUrl = resolveBffBaseUrl();
    const liquidityResponse = await fetch(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/liquidity`,
      { cache: "no-store" }
    );
    const allocationsResponse = await fetch(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/allocations`,
      { cache: "no-store" }
    );
    const positionsResponse = await fetch(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/positions`,
      { cache: "no-store" }
    );
    const transactionsResponse = await fetch(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/transactions?limit=8`,
      { cache: "no-store" }
    );
    const readinessResponse = await fetch(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/readiness`,
      { cache: "no-store" }
    );
    const workflowResponse = await fetch(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/workflow`,
      { cache: "no-store" }
    );
    const incomeResponse = await fetch(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/income-summary`,
      { cache: "no-store" }
    );
    const activityResponse = await fetch(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/activity-summary`,
      { cache: "no-store" }
    );

    if (
      !liquidityResponse.ok ||
      !allocationsResponse.ok ||
      !positionsResponse.ok ||
      !transactionsResponse.ok
    ) {
      return null;
    }

    const liquidityPayload =
      (await liquidityResponse.json()) as PortfolioLiquidityResponse;
    const allocationsPayload =
      (await allocationsResponse.json()) as PortfolioAllocationResponse;
    const positionsPayload =
      (await positionsResponse.json()) as PortfolioPositionsResponse;
    const transactionsPayload =
      (await transactionsResponse.json()) as PortfolioTransactionLedgerResponse;
    const incomePayload = incomeResponse.ok
      ? ((await incomeResponse.json()) as PortfolioIncomeSummaryResponse)
      : null;
    const activityPayload = activityResponse.ok
      ? ((await activityResponse.json()) as PortfolioActivitySummaryResponse)
      : null;
    const readinessPayload = readinessResponse.ok
      ? ((await readinessResponse.json()) as PortfolioReadinessResponse)
      : null;
    const workflowPayload = workflowResponse.ok
      ? ((await workflowResponse.json()) as PortfolioWorkflowResponse)
      : null;

    const allocationView =
      allocationsPayload.views.find((view) => view.dimension === "asset_class") ??
      allocationsPayload.views[0];

    return {
      allocations: (allocationView?.buckets ?? []).map((bucket) => ({
        asset_class: bucket.bucket,
        position_count: bucket.position_count,
        market_value_base: bucket.market_value_base,
        weight_pct: bucket.weight_pct,
      })),
      allocation_views: allocationsPayload.views,
      cash_balances: liquidityPayload.cash_balances,
      top_positions: positionsPayload.top_positions,
      positions: positionsPayload.positions,
      recent_transactions: transactionsPayload.transactions,
      income_summary: incomePayload,
      activity_summary: activityPayload,
      cashflow_outlook: liquidityPayload.cashflow_outlook,
      readiness_indicators: readinessPayload?.indicators ?? undefined,
      workflow_actions: workflowPayload?.actions ?? undefined,
    };
  } catch {
    return null;
  }
}

export function mergePortfolioWorkspace(
  workspace: PortfolioWorkspace,
  details: PortfolioWorkspaceDetails
): PortfolioWorkspace {
  return {
    ...workspace,
    ...details,
    cashflow_outlook: details.cashflow_outlook ?? workspace.cashflow_outlook,
  };
}

function resolveBffBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/bff";
  }

  return process.env.BFF_BASE_URL ?? BFF_BASE_URL;
}
