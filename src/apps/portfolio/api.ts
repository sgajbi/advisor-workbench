import type { PortfolioCatalogResponse, PortfolioWorkspace } from "./types";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";
const portfolioApiResponseCache = new Map<string, unknown>();
const portfolioApiInflightRequests = new Map<string, Promise<unknown>>();

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
  | "cash_balances"
  | "recent_transactions"
  | "cashflow_outlook"
  | "readiness_indicators"
  | "exception_summaries"
  | "insights"
  | "workflow_actions"
>;

export async function getPortfolioCatalog(): Promise<PortfolioCatalogResponse["items"]> {
  try {
    const payload = await fetchBffJson<PortfolioCatalogResponse>(
      `${resolveBffBaseUrl()}/api/v1/portfolio/portfolios`
    );
    if (!payload) {
      return [];
    }
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
    const summaryPayload = await fetchBffJson<PortfolioWorkspaceSummaryResponse>(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/workspace`,
      { useCache: false }
    );
    if (!summaryPayload) {
      return null;
    }

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
      allocationsPayload,
      positionsPayload,
      incomePayload,
      activityPayload,
    ] = await Promise.all([
      fetchBffJson<PortfolioAllocationResponse>(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/allocations`
      ),
      fetchBffJson<PortfolioPositionsResponse>(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/positions`
      ),
      fetchBffJson<PortfolioIncomeSummaryResponse>(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/income-summary`
      ),
      fetchBffJson<PortfolioActivitySummaryResponse>(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/activity-summary`
      ),
    ]);

    if (!allocationsPayload || !positionsPayload) {
      return null;
    }
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
    };
  } catch {
    return null;
  }
}

export async function getPortfolioWorkspaceDetailedDetails(
  portfolioId: string,
  params: {
    asOfDate?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<PortfolioWorkspaceDetailedDetails | null> {
  try {
    const baseUrl = resolveBffBaseUrl();
    const transactionSearchParams = new URLSearchParams();
    transactionSearchParams.set("limit", "200");
    if (params.asOfDate) {
      transactionSearchParams.set("as_of_date", params.asOfDate);
    }
    if (params.startDate) {
      transactionSearchParams.set("start_date", params.startDate);
    }
    if (params.endDate) {
      transactionSearchParams.set("end_date", params.endDate);
    }
    const [
      liquidityPayload,
      transactionsPayload,
      readinessPayload,
      insightsPayload,
      workflowPayload,
    ] = await Promise.all([
      fetchBffJson<PortfolioLiquidityResponse>(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/liquidity`
      ),
      fetchBffJson<PortfolioTransactionLedgerResponse>(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/transactions?${transactionSearchParams.toString()}`
      ),
      fetchBffJson<PortfolioReadinessResponse>(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/readiness`
      ),
      fetchBffJson<PortfolioInsightsResponse>(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/insights`
      ),
      fetchBffJson<PortfolioWorkflowResponse>(
        `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/workflow`
      ),
    ]);

    if (!liquidityPayload || !transactionsPayload) {
      return null;
    }

    return {
      cash_balances: liquidityPayload.cash_balances,
      recent_transactions: transactionsPayload.transactions,
      cashflow_outlook: liquidityPayload.cashflow_outlook,
      readiness_indicators: readinessPayload?.indicators ?? undefined,
      exception_summaries: insightsPayload?.exception_summaries ?? undefined,
      insights: insightsPayload?.insights ?? undefined,
      workflow_actions: workflowPayload?.actions ?? undefined,
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

    return await fetchBffJson<PortfolioTransactionLedgerResponse>(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/transactions?${searchParams.toString()}`
    );
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

    const payload = await fetchBffJson<PortfolioProjectedCashflowResponse>(
      `${baseUrl}/api/v1/portfolio/portfolios/${encodeURIComponent(portfolioId)}/projected-cashflow?${searchParams.toString()}`
    );
    if (!payload) {
      return null;
    }
    return payload.cashflow_outlook ?? null;
  } catch {
    return null;
  }
}

export function resetPortfolioApiRequestCache() {
  portfolioApiResponseCache.clear();
  portfolioApiInflightRequests.clear();
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

async function fetchBffJson<T>(
  url: string,
  options: {
    useCache?: boolean;
  } = {}
): Promise<T | null> {
  const useCache = options.useCache ?? true;

  if (useCache && portfolioApiResponseCache.has(url)) {
    return portfolioApiResponseCache.get(url) as T;
  }

  if (useCache) {
    const existingRequest = portfolioApiInflightRequests.get(url);
    if (existingRequest) {
      return (await existingRequest) as T;
    }
  }

  const request = (async () => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as T;
    if (useCache) {
      portfolioApiResponseCache.set(url, payload);
    }
    return payload;
  })();

  if (useCache) {
    portfolioApiInflightRequests.set(url, request);
  }

  try {
    return await request;
  } finally {
    if (useCache) {
      portfolioApiInflightRequests.delete(url);
    }
  }
}
