import type { PortfolioCatalogResponse, PortfolioWorkspace } from "./types";
import type { PortfolioTimeWindow } from "./view-model";
import {
  resolveGatewayBaseUrl,
  resolveWorkbenchApiBase,
  type ServiceRequestTarget,
} from "@/features/platform-runtime/service-addressing";

const portfolioApiResponseCache = new Map<string, unknown>();
const portfolioApiInflightRequests = new Map<string, Promise<unknown>>();
type PortfolioRequestTarget = ServiceRequestTarget;

function resolvePortfolioRequestTarget(): PortfolioRequestTarget {
  return typeof window === "undefined" ? "server" : "client";
}

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
  performance: PortfolioWorkspace["performance"];
  rebalance: PortfolioWorkspace["rebalance"];
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
  | "performance"
  | "readiness_indicators"
  | "exception_summaries"
  | "insights"
  | "workflow_actions"
>;

type PortfolioPerformanceSnapshotResponse = {
  period: string;
  as_of_date: string;
  report_start_date?: string | null;
  report_end_date?: string | null;
  benchmark_code: string | null;
  portfolio_return_pct: number | null;
  benchmark_return_pct: number | null;
  excess_return_pct: number | null;
  sparkline: Array<{
    as_of_date: string;
    portfolio_return_pct: number | null;
    benchmark_return_pct?: number | null;
    excess_return_pct?: number | null;
  }>;
  unavailable?: {
    title: string;
    detail: string;
    requirements: string[];
  } | null;
  warnings?: string[];
  partial_failures?: PortfolioWorkspace["partial_failures"];
};

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
    const payload = await fetchPortfolioJson<PortfolioCatalogResponse>(
      resolvePortfolioRequestTarget(),
      "/portfolio/portfolios"
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
    const summaryPayload = await fetchPortfolioJson<PortfolioWorkspaceSummaryResponse>(
      resolvePortfolioRequestTarget(),
      `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/workspace`,
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
      performance: summaryPayload.performance,
      rebalance: summaryPayload.rebalance,
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
  portfolioId: string,
  params: {
    asOfDate?: string;
    reportingCurrency?: string;
    includeProjected?: boolean;
    timeWindow: PortfolioTimeWindow;
    reportStartDate: string;
    reportEndDate: string;
    usesCustomDateRange?: boolean;
  }
): Promise<PortfolioWorkspaceSummaryDetails | null> {
  try {
    const performanceQuery = buildPortfolioPerformanceSnapshotQuery(params);
    // Keep the modular book-family reads here for now. Gateway `/book` aligns as-of date and
    // projected positions, but it does not yet support `reporting_currency`, and this workspace
    // now relies on source-backed position restatement instead of rebuilding that in the client.
    const [
      allocationsPayload,
      positionsPayload,
      incomePayload,
      activityPayload,
      performancePayload,
    ] = await Promise.all([
      fetchPortfolioJson<PortfolioAllocationResponse>(
        resolvePortfolioRequestTarget(),
        `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/allocations`
      ),
      fetchPortfolioJson<PortfolioPositionsResponse>(
        resolvePortfolioRequestTarget(),
        `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/positions`,
        { query: buildPortfolioPositionsQuery(params) }
      ),
      fetchPortfolioJson<PortfolioIncomeSummaryResponse>(
        resolvePortfolioRequestTarget(),
        `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/income-summary`
      ),
      fetchPortfolioJson<PortfolioActivitySummaryResponse>(
        resolvePortfolioRequestTarget(),
        `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/activity-summary`
      ),
      fetchPortfolioJson<PortfolioPerformanceSnapshotResponse>(
        resolvePortfolioRequestTarget(),
        `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/performance-snapshot`,
        { query: performanceQuery }
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
      performance: mapPortfolioPerformanceSnapshot(performancePayload),
    };
  } catch {
    return null;
  }
}

export async function getPortfolioWorkspaceDetailedDetails(
  portfolioId: string,
  params: {
    asOfDate?: string;
    reportingCurrency?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<PortfolioWorkspaceDetailedDetails | null> {
  try {
    const transactionSearchParams = new URLSearchParams();
    transactionSearchParams.set("limit", "200");
    const sharedSearchParams = new URLSearchParams();
    const liquiditySearchParams = new URLSearchParams();
    if (params.asOfDate) {
      transactionSearchParams.set("as_of_date", params.asOfDate);
      sharedSearchParams.set("as_of_date", params.asOfDate);
      liquiditySearchParams.set("as_of_date", params.asOfDate);
    }
    if (params.reportingCurrency) {
      liquiditySearchParams.set("reporting_currency", params.reportingCurrency);
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
      fetchPortfolioJson<PortfolioLiquidityResponse>(
        resolvePortfolioRequestTarget(),
        `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/liquidity`,
        { query: liquiditySearchParams }
      ),
      fetchPortfolioJson<PortfolioTransactionLedgerResponse>(
        resolvePortfolioRequestTarget(),
        `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/transactions`,
        { query: transactionSearchParams }
      ),
      fetchPortfolioJson<PortfolioReadinessResponse>(
        resolvePortfolioRequestTarget(),
        `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/readiness`,
        { query: sharedSearchParams }
      ),
      fetchPortfolioJson<PortfolioInsightsResponse>(
        resolvePortfolioRequestTarget(),
        `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/insights`,
        { query: sharedSearchParams }
      ),
      fetchPortfolioJson<PortfolioWorkflowResponse>(
        resolvePortfolioRequestTarget(),
        `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/workflow`,
        { query: sharedSearchParams }
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

    return await fetchPortfolioJson<PortfolioTransactionLedgerResponse>(
      resolvePortfolioRequestTarget(),
      `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/transactions`,
      { query: searchParams }
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

    const payload = await fetchPortfolioJson<PortfolioProjectedCashflowResponse>(
      resolvePortfolioRequestTarget(),
      `/portfolio/portfolios/${encodeURIComponent(portfolioId)}/projected-cashflow`,
      { query: searchParams }
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

function buildPortfolioPerformanceSnapshotQuery(params: {
  timeWindow: PortfolioTimeWindow;
  reportStartDate: string;
  reportEndDate: string;
  usesCustomDateRange?: boolean;
}) {
  const query = new URLSearchParams();
  const useExplicitWindow =
    params.usesCustomDateRange || params.timeWindow === "7D" || params.timeWindow === "30D";

  query.set("period", useExplicitWindow ? "EXPLICIT" : params.timeWindow);
  query.set("report_end_date", params.reportEndDate);

  if (useExplicitWindow) {
    query.set("report_start_date", params.reportStartDate);
  }

  return query;
}

function buildPortfolioPositionsQuery(params: {
  asOfDate?: string;
  reportingCurrency?: string;
  includeProjected?: boolean;
}) {
  const query = new URLSearchParams();

  if (params.asOfDate) {
    query.set("as_of_date", params.asOfDate);
  }
  if (params.reportingCurrency) {
    query.set("reporting_currency", params.reportingCurrency);
  }
  query.set("include_projected", String(params.includeProjected ?? false));

  return query;
}

function mapPortfolioPerformanceSnapshot(
  payload: PortfolioPerformanceSnapshotResponse | null
): PortfolioWorkspace["performance"] {
  if (!payload) {
    return null;
  }

  const reportStartDate = payload.sparkline[0]?.as_of_date ?? null;
  return {
    period: payload.period,
    report_start_date: payload.report_start_date ?? reportStartDate,
    report_end_date: payload.report_end_date ?? payload.as_of_date,
    return_pct: payload.portfolio_return_pct,
    money_weighted_return_pct: null,
    money_weighted_method: null,
    benchmark_code: payload.benchmark_code,
    benchmark_label: null,
    benchmark_return_pct: payload.benchmark_return_pct,
    benchmark_return_source: null,
    benchmark_input_mode: null,
    excess_return_pct: payload.excess_return_pct,
    sparkline_points: payload.sparkline.map((point) => ({
      label: point.as_of_date,
      portfolio_return_pct: point.portfolio_return_pct,
      benchmark_return_pct: point.benchmark_return_pct ?? null,
      active_return_pct: point.excess_return_pct ?? null,
    })),
    unavailable: payload.unavailable ?? null,
    warnings: payload.warnings ?? [],
    partial_failures: payload.partial_failures ?? [],
  };
}

function buildPortfolioApiUrl(
  target: PortfolioRequestTarget,
  path: string,
  query?: URLSearchParams
): string {
  const baseUrl = resolveBffBaseUrlForTarget(target);
  const suffix = query?.toString();
  return suffix ? `${baseUrl}/api/v1${path}?${suffix}` : `${baseUrl}/api/v1${path}`;
}

function resolveBffBaseUrlForTarget(target: PortfolioRequestTarget): string {
  if (target === "client") {
    return resolveWorkbenchApiBase("client").replace(/\/api\/v1$/, "");
  }
  return resolveGatewayBaseUrl();
}

async function fetchPortfolioJson<T>(
  target: PortfolioRequestTarget,
  path: string,
  options: {
    useCache?: boolean;
    query?: URLSearchParams;
  } = {}
): Promise<T | null> {
  const useCache = options.useCache ?? true;
  const url = buildPortfolioApiUrl(target, path, options.query);

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
