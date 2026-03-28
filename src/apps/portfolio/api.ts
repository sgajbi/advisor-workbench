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
  total?: number;
  skip?: number;
  limit?: number;
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

type PortfolioInsightsResponse = {
  insights: NonNullable<PortfolioWorkspace["insights"]>;
  exception_summaries: NonNullable<PortfolioWorkspace["exception_summaries"]>;
};

type PortfolioProjectedCashflowResponse = {
  cashflow_outlook: PortfolioWorkspace["cashflow_outlook"];
};

type PortfolioWorkspaceSummaryDetails = Pick<
  PortfolioWorkspace,
  | "allocations"
  | "allocation_views"
  | "top_positions"
  | "positions"
  | "income_summary"
  | "activity_summary"
  | "readiness_indicators"
  | "exception_summaries"
  | "insights"
  | "workflow_actions"
>;

type PortfolioWorkspaceDetailedDetails = Pick<
  PortfolioWorkspace,
  "cash_balances" | "recent_transactions" | "cashflow_outlook"
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

export async function getPortfolioWorkspaceSummaryDetails(
  portfolioId: string
): Promise<PortfolioWorkspaceSummaryDetails | null> {
  try {
    const baseUrl = resolveBffBaseUrl();
    const [
      allocationsResponse,
      positionsResponse,
      readinessResponse,
      insightsResponse,
      workflowResponse,
      incomeResponse,
      activityResponse,
    ] = await Promise.all([
      fetch(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/allocations`,
        { cache: "no-store" }
      ),
      fetch(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/positions`,
        { cache: "no-store" }
      ),
      fetch(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/readiness`,
        { cache: "no-store" }
      ),
      fetch(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/insights`,
        { cache: "no-store" }
      ),
      fetch(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/workflow`,
        { cache: "no-store" }
      ),
      fetch(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/income-summary`,
        { cache: "no-store" }
      ),
      fetch(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/activity-summary`,
        { cache: "no-store" }
      ),
    ]);

    if (!allocationsResponse.ok || !positionsResponse.ok) {
      return null;
    }

    const allocationsPayload =
      (await allocationsResponse.json()) as PortfolioAllocationResponse;
    const positionsPayload =
      (await positionsResponse.json()) as PortfolioPositionsResponse;
    const incomePayload = incomeResponse.ok
      ? ((await incomeResponse.json()) as PortfolioIncomeSummaryResponse)
      : null;
    const activityPayload = activityResponse.ok
      ? ((await activityResponse.json()) as PortfolioActivitySummaryResponse)
      : null;
    const readinessPayload = readinessResponse.ok
      ? ((await readinessResponse.json()) as PortfolioReadinessResponse)
      : null;
    const insightsPayload = insightsResponse.ok
      ? ((await insightsResponse.json()) as PortfolioInsightsResponse)
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
      top_positions: positionsPayload.top_positions,
      positions: positionsPayload.positions,
      income_summary: incomePayload,
      activity_summary: activityPayload,
      readiness_indicators: readinessPayload?.indicators ?? undefined,
      exception_summaries: insightsPayload?.exception_summaries ?? undefined,
      insights: insightsPayload?.insights ?? undefined,
      workflow_actions: workflowPayload?.actions ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function getPortfolioWorkspaceDetailedDetails(
  portfolioId: string
): Promise<PortfolioWorkspaceDetailedDetails | null> {
  try {
    const baseUrl = resolveBffBaseUrl();
    const [liquidityResponse, transactionsResponse] = await Promise.all([
      fetch(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/liquidity`,
        { cache: "no-store" }
      ),
      fetch(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/transactions?limit=200`,
        { cache: "no-store" }
      ),
    ]);

    if (!liquidityResponse.ok || !transactionsResponse.ok) {
      return null;
    }

    const liquidityPayload =
      (await liquidityResponse.json()) as PortfolioLiquidityResponse;
    const transactionsPayload =
      (await transactionsResponse.json()) as PortfolioTransactionLedgerResponse;

    return {
      cash_balances: liquidityPayload.cash_balances,
      recent_transactions: transactionsPayload.transactions,
      cashflow_outlook: liquidityPayload.cashflow_outlook,
    };
  } catch {
    return null;
  }
}

export async function getPortfolioTransactionLedger(
  portfolioId: string,
  params: {
    asOfDate?: string;
    startDate?: string;
    endDate?: string;
    transactionType?: string;
    limit?: number;
    skip?: number;
  } = {}
): Promise<PortfolioTransactionLedgerResponse | null> {
  try {
    const baseUrl = resolveBffBaseUrl();
    const searchParams = new URLSearchParams();
    searchParams.set("limit", String(params.limit ?? 200));
    searchParams.set("skip", String(params.skip ?? 0));

    if (params.asOfDate) {
      searchParams.set("as_of_date", params.asOfDate);
    }
    if (params.startDate) {
      searchParams.set("start_date", params.startDate);
    }
    if (params.endDate) {
      searchParams.set("end_date", params.endDate);
    }
    if (params.transactionType && params.transactionType !== "ALL") {
      searchParams.set("transaction_type", params.transactionType);
    }

    const response = await fetch(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/transactions?${searchParams.toString()}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PortfolioTransactionLedgerResponse;
  } catch {
    return null;
  }
}

export async function getPortfolioProjectedCashflow(
  portfolioId: string,
  params: {
    asOfDate?: string;
    horizonDays?: number;
    includeProjected?: boolean;
  } = {}
): Promise<PortfolioWorkspace["cashflow_outlook"] | null> {
  try {
    const baseUrl = resolveBffBaseUrl();
    const searchParams = new URLSearchParams();
    if (params.asOfDate) {
      searchParams.set("as_of_date", params.asOfDate);
    }
    if (params.horizonDays) {
      searchParams.set("horizon_days", String(params.horizonDays));
    }
    if (params.includeProjected !== undefined) {
      searchParams.set("include_projected", String(params.includeProjected));
    }

    const response = await fetch(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/projected-cashflow?${searchParams.toString()}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as PortfolioProjectedCashflowResponse;
    return payload.cashflow_outlook ?? null;
  } catch {
    return null;
  }
}

export function mergePortfolioWorkspace(
  workspace: PortfolioWorkspace,
  details: Partial<PortfolioWorkspace>
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
