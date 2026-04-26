import {
  WorkbenchAnalytics,
  WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest,
  WorkbenchPerformanceAdvisorBrief,
  WorkbenchPerformanceAttributionTrend,
  WorkbenchOverview,
  WorkbenchPerformanceHorizonComparison,
  WorkbenchRiskConcentrationResponse,
  WorkbenchRiskDrawdownResponse,
  WorkbenchRiskAttributionResponse,
  WorkbenchRiskRollingResponse,
  WorkbenchRiskSummaryResponse,
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
  WorkbenchPortfolio360,
  ReportBatchHandleResponse,
  ReportBatchStatusResponse,
  ReportBatchWorkerRunResponse,
  WorkbenchReportingSnapshot,
  WorkbenchSandboxState,
} from "./types";
import {
  resolveBffProxyBaseUrl,
  resolveWorkbenchApiBase,
  type ServiceRequestTarget,
} from "@/features/platform-runtime/service-addressing";

const BFF_PROXY_BASE = `${resolveBffProxyBaseUrl()}/api/v1`;
type WorkbenchRequestTarget = ServiceRequestTarget;

function buildPerformanceWorkspaceQuery(params: {
  period: string;
  chartFrequency: string;
  contributionDimension: string;
  attributionDimension: string;
  detailBasis: string;
  benchmark?: string;
  reportStartDate?: string;
  reportEndDate?: string;
}): string {
  const query = new URLSearchParams();
  query.set("period", params.period);
  query.set("chart_frequency", params.chartFrequency);
  query.set("contribution_dimension", params.contributionDimension);
  query.set("attribution_dimension", params.attributionDimension);
  query.set("detail_basis", params.detailBasis);
  if (params.benchmark) {
    query.set("benchmark_code", params.benchmark);
  }
  if (params.reportStartDate) {
    query.set("report_start_date", params.reportStartDate);
  }
  if (params.reportEndDate) {
    query.set("report_end_date", params.reportEndDate);
  }
  return query.toString();
}

async function fetchWorkbenchJson<T>(url: string, errorLabel: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${errorLabel} (${response.status})`);
  }
  return (await response.json()) as T;
}

async function fetchWorkbenchMutation<T>(
  url: string,
  errorLabel: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to ${errorLabel} (${response.status}): ${body}`);
  }
  return (await response.json()) as T;
}

function buildWorkbenchUrl(
  target: WorkbenchRequestTarget,
  path: string,
  query?: URLSearchParams | string
): string {
  const baseUrl = resolveWorkbenchApiBase(target);
  const suffix =
    query instanceof URLSearchParams ? query.toString() : query;
  return suffix ? `${baseUrl}${path}?${suffix}` : `${baseUrl}${path}`;
}

async function fetchWorkbenchResource<T>(
  target: WorkbenchRequestTarget,
  path: string,
  errorLabel: string,
  query?: URLSearchParams | string
): Promise<T> {
  return await fetchWorkbenchJson<T>(buildWorkbenchUrl(target, path, query), errorLabel);
}

function buildPerformanceWorkspaceUrl(
  portfolioId: string,
  params: {
    period: string;
    chartFrequency: string;
    contributionDimension: string;
    attributionDimension: string;
    detailBasis: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  },
  pathSuffix: string,
  target: WorkbenchRequestTarget
): string {
  const query = buildPerformanceWorkspaceQuery(params);
  return buildWorkbenchUrl(
    target,
    `/workbench/${portfolioId}/performance${pathSuffix}`,
    query
  );
}

export async function getWorkbenchOverview(portfolioId: string): Promise<WorkbenchOverview> {
  return await fetchWorkbenchResource<WorkbenchOverview>(
    "server",
    `/workbench/${portfolioId}/overview`,
    "overview"
  );
}

export async function getPortfolio360(
  portfolioId: string,
  sessionId?: string
): Promise<WorkbenchPortfolio360> {
  const query = sessionId
    ? new URLSearchParams({ session_id: sessionId })
    : undefined;
  return await fetchWorkbenchResource<WorkbenchPortfolio360>(
    "server",
    `/workbench/${portfolioId}/portfolio-360`,
    "portfolio 360"
    ,
    query
  );
}

export async function createSandboxSession(
  portfolioId: string,
  payload: { created_by?: string; ttl_hours?: number }
): Promise<WorkbenchSandboxState> {
  const response = await fetch(`${BFF_PROXY_BASE}/workbench/${portfolioId}/sandbox/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sandbox create failed (${response.status}): ${body}`);
  }
  return (await response.json()) as WorkbenchSandboxState;
}

export async function applySandboxChanges(
  portfolioId: string,
  sessionId: string,
  payload: {
    changes: Array<{
      security_id: string;
      transaction_type: string;
      quantity?: number;
      amount?: number;
      currency?: string;
    }>;
    evaluate_policy?: boolean;
  }
): Promise<WorkbenchSandboxState> {
  const response = await fetch(
    `${BFF_PROXY_BASE}/workbench/${portfolioId}/sandbox/sessions/${sessionId}/changes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sandbox apply failed (${response.status}): ${body}`);
  }
  return (await response.json()) as WorkbenchSandboxState;
}

export async function getWorkbenchAnalytics(
  portfolioId: string,
  params: {
    period: string;
    groupBy: string;
    benchmark?: string;
    sessionId?: string;
  }
): Promise<WorkbenchAnalytics> {
  const query = new URLSearchParams();
  query.set("period", params.period);
  query.set("group_by", params.groupBy);
  if (params.benchmark) {
    query.set("benchmark_code", params.benchmark);
  }
  if (params.sessionId) {
    query.set("session_id", params.sessionId);
  }
  return await fetchWorkbenchResource<WorkbenchAnalytics>(
    "server",
    `/workbench/${portfolioId}/analytics`,
    "workbench analytics",
    query
  );
}

export async function getWorkbenchPerformanceWorkspaceSummary(
  portfolioId: string,
  params: {
    period: string;
    chartFrequency: string;
    contributionDimension: string;
    attributionDimension: string;
    detailBasis: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }
): Promise<WorkbenchPerformanceWorkspaceSummary> {
  return await fetchWorkbenchJson<WorkbenchPerformanceWorkspaceSummary>(
    buildPerformanceWorkspaceUrl(portfolioId, params, "/summary", "server"),
    "performance workspace summary"
  );
}

export async function getWorkbenchPerformanceWorkspaceDetails(
  portfolioId: string,
  params: {
    period: string;
    chartFrequency: string;
    contributionDimension: string;
    attributionDimension: string;
    detailBasis: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }
): Promise<WorkbenchPerformanceWorkspaceDetails> {
  return await fetchWorkbenchJson<WorkbenchPerformanceWorkspaceDetails>(
    buildPerformanceWorkspaceUrl(portfolioId, params, "/details", "server"),
    "performance workspace details"
  );
}

export async function getWorkbenchPerformanceWorkspaceSummaryClient(
  portfolioId: string,
  params: {
    period: string;
    chartFrequency: string;
    contributionDimension: string;
    attributionDimension: string;
    detailBasis: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }
): Promise<WorkbenchPerformanceWorkspaceSummary> {
  return await fetchWorkbenchJson<WorkbenchPerformanceWorkspaceSummary>(
    buildPerformanceWorkspaceUrl(portfolioId, params, "/summary", "client"),
    "performance workspace summary"
  );
}

export async function getWorkbenchPerformanceWorkspaceDetailsClient(
  portfolioId: string,
  params: {
    period: string;
    chartFrequency: string;
    contributionDimension: string;
    attributionDimension: string;
    detailBasis: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }
): Promise<WorkbenchPerformanceWorkspaceDetails> {
  return await fetchWorkbenchJson<WorkbenchPerformanceWorkspaceDetails>(
    buildPerformanceWorkspaceUrl(portfolioId, params, "/details", "client"),
    "performance workspace details"
  );
}

export async function getWorkbenchPerformanceHorizonComparisonClient(
  portfolioId: string,
  params: {
    period?: string;
    detailBasis: string;
    benchmark?: string;
    chartFrequency?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }
): Promise<WorkbenchPerformanceHorizonComparison> {
  const query = new URLSearchParams();
  if (params.period) {
    query.set("period", params.period);
  }
  query.set("detail_basis", params.detailBasis);
  query.set("chart_frequency", params.chartFrequency ?? "monthly");
  if (params.benchmark) {
    query.set("benchmark_code", params.benchmark);
  }
  if (params.reportStartDate) {
    query.set("report_start_date", params.reportStartDate);
  }
  if (params.reportEndDate) {
    query.set("report_end_date", params.reportEndDate);
  }
  return await fetchWorkbenchResource<WorkbenchPerformanceHorizonComparison>(
    "client",
    `/workbench/${portfolioId}/performance/horizon-comparison`,
    "performance horizon comparison",
    query
  );
}

export async function getWorkbenchPerformanceAttributionTrendClient(
  portfolioId: string,
  params: {
    period: string;
    chartFrequency: string;
    attributionDimension: string;
    detailBasis: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }
): Promise<WorkbenchPerformanceAttributionTrend> {
  const query = new URLSearchParams();
  query.set("period", params.period);
  query.set("chart_frequency", params.chartFrequency);
  query.set("attribution_dimension", params.attributionDimension);
  query.set("detail_basis", params.detailBasis);
  if (params.benchmark) {
    query.set("benchmark_code", params.benchmark);
  }
  if (params.reportStartDate) {
    query.set("report_start_date", params.reportStartDate);
  }
  if (params.reportEndDate) {
    query.set("report_end_date", params.reportEndDate);
  }
  return await fetchWorkbenchResource<WorkbenchPerformanceAttributionTrend>(
    "client",
    `/workbench/${portfolioId}/performance/attribution-trend`,
    "performance attribution trend",
    query
  );
}

export async function getWorkbenchPerformanceAdvisorBriefClient(
  portfolioId: string,
  params: {
    period: string;
    chartFrequency: string;
    contributionDimension: string;
    attributionDimension: string;
    detailBasis: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }
): Promise<WorkbenchPerformanceAdvisorBrief> {
  return await fetchWorkbenchResource<WorkbenchPerformanceAdvisorBrief>(
    "client",
    `/workbench/${portfolioId}/performance/advisor-brief`,
    "performance advisor brief",
    buildPerformanceWorkspaceQuery(params)
  );
}

export async function postWorkbenchPerformanceAdvisorBriefReviewActionClient(
  portfolioId: string,
  params: {
    period: string;
    chartFrequency: string;
    contributionDimension: string;
    attributionDimension: string;
    detailBasis: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  },
  payload: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest
): Promise<WorkbenchPerformanceAdvisorBrief> {
  const response = await fetch(
    buildWorkbenchUrl(
      "client",
      `/workbench/${portfolioId}/performance/advisor-brief/review-actions`,
      buildPerformanceWorkspaceQuery(params)
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to record performance advisor brief review action (${response.status})`
    );
  }
  return (await response.json()) as WorkbenchPerformanceAdvisorBrief;
}

function buildRiskWorkspaceQuery(params: {
  period: string;
  detailBasis?: string;
  benchmark?: string;
  asOfDate?: string;
  reportingCurrency?: string;
}): string {
  const query = new URLSearchParams();
  query.set("period", params.period);
  if (params.detailBasis) {
    query.set("detail_basis", params.detailBasis);
  }
  if (params.benchmark) {
    query.set("benchmark_code", params.benchmark);
  }
  if (params.asOfDate) {
    query.set("as_of_date", params.asOfDate);
  }
  if (params.reportingCurrency) {
    query.set("reporting_currency", params.reportingCurrency);
  }
  return query.toString();
}

function buildRiskWorkspaceUrl(
  portfolioId: string,
  pathSuffix:
    | "/risk/summary"
    | "/risk/concentration"
    | "/risk/drawdown"
    | "/risk/attribution",
  params: {
    period: string;
    detailBasis?: string;
    benchmark?: string;
    asOfDate?: string;
    reportingCurrency?: string;
  },
  target: WorkbenchRequestTarget
): string {
  return buildWorkbenchUrl(
    target,
    `/workbench/${portfolioId}${pathSuffix}`,
    buildRiskWorkspaceQuery(params)
  );
}

export async function getWorkbenchRiskSummaryClient(
  portfolioId: string,
  params: {
    period: string;
    detailBasis: string;
    benchmark?: string;
    asOfDate?: string;
    reportingCurrency?: string;
  }
): Promise<WorkbenchRiskSummaryResponse> {
  return await fetchWorkbenchJson<WorkbenchRiskSummaryResponse>(
    buildRiskWorkspaceUrl(portfolioId, "/risk/summary", params, "client"),
    "workbench risk summary"
  );
}

export async function getWorkbenchRiskConcentrationClient(
  portfolioId: string,
  params: {
    period: string;
    benchmark?: string;
    asOfDate?: string;
    reportingCurrency?: string;
  }
): Promise<WorkbenchRiskConcentrationResponse> {
  return await fetchWorkbenchJson<WorkbenchRiskConcentrationResponse>(
    buildRiskWorkspaceUrl(portfolioId, "/risk/concentration", params, "client"),
    "workbench risk concentration"
  );
}

export async function getWorkbenchRiskDrawdownClient(
  portfolioId: string,
  params: {
    period: string;
    detailBasis: string;
    benchmark?: string;
    asOfDate?: string;
    reportingCurrency?: string;
    includeUnderwaterSeries?: boolean;
  }
): Promise<WorkbenchRiskDrawdownResponse> {
  const query = new URLSearchParams(
    buildRiskWorkspaceQuery({
      period: params.period,
      detailBasis: params.detailBasis,
      benchmark: params.benchmark,
      asOfDate: params.asOfDate,
      reportingCurrency: params.reportingCurrency,
    })
  );
  if (params.includeUnderwaterSeries) {
    query.set("include_underwater_series", "true");
  }
  return await fetchWorkbenchJson<WorkbenchRiskDrawdownResponse>(
    buildWorkbenchUrl("client", `/workbench/${portfolioId}/risk/drawdown`, query),
    "workbench risk drawdown"
  );
}

export async function getWorkbenchRiskRollingClient(
  portfolioId: string,
  params: {
    period: string;
    detailBasis: string;
    benchmark?: string;
    asOfDate?: string;
    reportingCurrency?: string;
    includeTimeSeries?: boolean;
  }
): Promise<WorkbenchRiskRollingResponse> {
  const query = new URLSearchParams(
    buildRiskWorkspaceQuery({
      period: params.period,
      detailBasis: params.detailBasis,
      benchmark: params.benchmark,
      asOfDate: params.asOfDate,
      reportingCurrency: params.reportingCurrency,
    })
  );
  if (params.includeTimeSeries) {
    query.set("include_time_series", "true");
  }
  return await fetchWorkbenchJson<WorkbenchRiskRollingResponse>(
    buildWorkbenchUrl("client", `/workbench/${portfolioId}/risk/rolling`, query),
    "workbench risk rolling"
  );
}

export async function getWorkbenchRiskAttributionClient(
  portfolioId: string,
  params: {
    period: string;
    detailBasis: string;
    benchmark?: string;
    asOfDate?: string;
    reportingCurrency?: string;
    attributionType: string;
    groupingDimension: string;
  }
): Promise<WorkbenchRiskAttributionResponse> {
  const query = new URLSearchParams(
    buildRiskWorkspaceQuery({
      period: params.period,
      detailBasis: params.detailBasis,
      benchmark: params.benchmark,
      asOfDate: params.asOfDate,
      reportingCurrency: params.reportingCurrency,
    })
  );
  query.set("attribution_type", params.attributionType);
  query.set("grouping_dimension", params.groupingDimension);
  return await fetchWorkbenchJson<WorkbenchRiskAttributionResponse>(
    buildWorkbenchUrl("client", `/workbench/${portfolioId}/risk/attribution`, query),
    "workbench risk attribution"
  );
}

export async function getReportingSnapshot(
  portfolioId: string,
  asOfDate: string
): Promise<WorkbenchReportingSnapshot> {
  const query = new URLSearchParams();
  query.set("asOfDate", asOfDate);
  return await fetchWorkbenchResource<WorkbenchReportingSnapshot>(
    "server",
    `/reports/${portfolioId}/snapshot`,
    "reporting snapshot",
    query
  );
}

function buildReportBatchCallerHeaders(params: {
  actorId: string;
  tenantId: string;
  region: string;
  bookingCenterCode?: string | null;
  role?: string;
  correlationId: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Actor-Id": params.actorId,
    "X-Caller-Application": "lotus-workbench",
    "X-Tenant-Id": params.tenantId,
    "X-Region": params.region,
    "X-Role": params.role ?? "front-office-operator",
    "X-Correlation-Id": params.correlationId,
  };
  if (params.bookingCenterCode) {
    headers["X-Booking-Center-Code"] = params.bookingCenterCode;
  }
  return headers;
}

export async function createPortfolioReportBatch(params: {
  portfolioId: string;
  asOfDate: string;
  reportingCurrency: string;
  tenantId?: string;
  region?: string;
  bookingCenterCode?: string | null;
  actorId?: string;
  sections?: string[];
  benchmarkCode?: string;
}): Promise<ReportBatchHandleResponse> {
  const tenantId = params.tenantId ?? "tenant-sg";
  const region = params.region ?? "APAC";
  const actorId = params.actorId ?? "workbench-report-operator";
  const correlationId = `corr-workbench-report-batch-${params.portfolioId}-${params.asOfDate}`;
  const idempotencyKey = [
    "workbench-report-batch",
    params.portfolioId,
    params.asOfDate,
    params.reportingCurrency,
  ].join("-");

  return await fetchWorkbenchMutation<ReportBatchHandleResponse>(
    buildWorkbenchUrl("client", "/report-batches"),
    "create report batch",
    {
      method: "POST",
      headers: {
        ...buildReportBatchCallerHeaders({
          actorId,
          tenantId,
          region,
          bookingCenterCode: params.bookingCenterCode,
          correlationId,
        }),
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        selector_mode: "explicit_portfolio_list",
        portfolio_ids: [params.portfolioId],
        source_candidates: [
          {
            portfolio_id: params.portfolioId,
            tenant_id: tenantId,
            region,
            active: true,
            selected: true,
            source_system: "lotus-core",
            source_object: "PortfolioScope",
          },
        ],
        as_of_date: params.asOfDate,
        requested_output_formats: ["pdf"],
        reporting_currency: params.reportingCurrency,
        options: {
          sections: params.sections ?? ["OVERVIEW", "PERFORMANCE", "RISK_ANALYTICS"],
          ...(params.benchmarkCode ? { benchmark_code: params.benchmarkCode } : {}),
          source_surface: "lotus-workbench",
        },
        max_batch_size: 1,
      }),
    }
  );
}

export async function getReportBatchStatus(
  batchId: string,
  params: {
    tenantId?: string;
    region?: string;
    bookingCenterCode?: string | null;
    actorId?: string;
  } = {}
): Promise<ReportBatchStatusResponse> {
  const tenantId = params.tenantId ?? "tenant-sg";
  const region = params.region ?? "APAC";
  const actorId = params.actorId ?? "workbench-report-operator";
  return await fetchWorkbenchMutation<ReportBatchStatusResponse>(
    buildWorkbenchUrl("client", `/report-batches/${encodeURIComponent(batchId)}`),
    "report batch status",
    {
      method: "GET",
      headers: buildReportBatchCallerHeaders({
        actorId,
        tenantId,
        region,
        bookingCenterCode: params.bookingCenterCode,
        correlationId: `corr-workbench-report-batch-status-${batchId}`,
      }),
    }
  );
}

export async function runReportBatchOnce(params: {
  batchId: string;
  tenantId?: string;
  region?: string;
  bookingCenterCode?: string | null;
  actorId?: string;
}): Promise<ReportBatchWorkerRunResponse> {
  const tenantId = params.tenantId ?? "tenant-sg";
  const region = params.region ?? "APAC";
  const actorId = params.actorId ?? "workbench-report-operator";
  return await fetchWorkbenchMutation<ReportBatchWorkerRunResponse>(
    buildWorkbenchUrl("client", `/report-batches/${encodeURIComponent(params.batchId)}:run-once`),
    "run report batch",
    {
      method: "POST",
      headers: buildReportBatchCallerHeaders({
        actorId,
        tenantId,
        region,
        bookingCenterCode: params.bookingCenterCode,
        correlationId: `corr-workbench-report-batch-run-${params.batchId}`,
      }),
      body: JSON.stringify({
        worker_id: "lotus-workbench-report-batch-operator",
        recover_expired_leases: true,
        dispatch_policy: {
          max_active_batches: 100,
          max_active_items: 100,
          max_active_upstream_jobs: 100,
          max_active_render_jobs: 100,
          max_active_archive_jobs: 100,
          lease_seconds: 300,
        },
        runtime_load: {
          active_batches: 0,
          active_items: 0,
          active_upstream_jobs: 0,
          active_render_jobs: 0,
          active_archive_jobs: 0,
        },
      }),
    }
  );
}
