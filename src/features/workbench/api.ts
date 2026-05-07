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
  DpmCommandCenterGatewayResponse,
  DpmConstructionGatewayResponse,
  DpmOutcomeReviewGatewayResponse,
  DpmOutcomeReviewHandoffResponse,
  DpmOutcomeReviewNarrativeResponse,
  DpmProofPackGatewayResponse,
  DpmProofPackMarkdownResponse,
  ReportJobHandleResponse,
  ReportBatchHandleResponse,
  ReportBatchStatusResponse,
  ReportBatchWorkerRunResponse,
  ArchivedDocumentMetadataResponse,
  WorkbenchReportingSnapshot,
  WorkbenchSandboxState,
} from "./types";
import {
  resolveBffProxyBaseUrl,
  resolveWorkbenchApiBase,
  type ServiceRequestTarget,
} from "@/features/platform-runtime/service-addressing";
import { buildAnalyticsUiCorrelationHeaders } from "@/features/analytics-observability/correlation";
import {
  applyDefaultCallerContextHeaders,
  resolveDefaultCallerContext,
  resolveDefaultDpmContext,
} from "./caller-context";
import {
  WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES,
  observeWorkbenchAnalyticsRequest,
  type WorkbenchAnalyticsUiObservationContext,
  type WorkbenchAnalyticsUiObservationOptions,
} from "@/features/analytics-observability/metrics";

const BFF_PROXY_BASE = `${resolveBffProxyBaseUrl()}/api/v1`;
type WorkbenchRequestTarget = ServiceRequestTarget;

export class WorkbenchApiError extends Error {
  readonly status: number;

  constructor(errorLabel: string, status: number) {
    super(`Failed to fetch ${errorLabel} (${status})`);
    this.name = "WorkbenchApiError";
    this.status = status;
  }
}

export function getWorkbenchApiErrorStatus(error: unknown): number | null {
  if (error instanceof WorkbenchApiError) {
    return error.status;
  }
  if (error instanceof Error) {
    const match = error.message.match(/\((\d{3})\)$/);
    return match ? Number(match[1]) : null;
  }
  return null;
}

export function isWorkbenchPermissionBlockedError(error: unknown): boolean {
  const status = getWorkbenchApiErrorStatus(error);
  return status === 401 || status === 403;
}

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

async function fetchWorkbenchJson<T>(
  url: string,
  errorLabel: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) {
    throw new WorkbenchApiError(errorLabel, response.status);
  }
  return (await response.json()) as T;
}

async function fetchWorkbenchMutation<T>(
  url: string,
  errorLabel: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...withJsonMutationHeaders(init) });
  if (!response.ok) {
    throw new WorkbenchApiError(errorLabel, response.status);
  }
  return (await response.json()) as T;
}

function withJsonMutationHeaders(init: RequestInit): RequestInit {
  if (typeof init.body !== "string") {
    return init;
  }

  const headers = init.headers;
  if (headers instanceof Headers) {
    const nextHeaders = new Headers(headers);
    if (!nextHeaders.has("Content-Type")) {
      nextHeaders.set("Content-Type", "application/json");
    }
    return { ...init, headers: nextHeaders };
  }

  if (Array.isArray(headers)) {
    const hasContentType = headers.some(([key]) => key.toLowerCase() === "content-type");
    return {
      ...init,
      headers: hasContentType ? headers : [["Content-Type", "application/json"], ...headers],
    };
  }

  const nextHeaders: Record<string, string> = { ...(headers as Record<string, string> | undefined) };
  const hasContentType = Object.keys(nextHeaders).some((key) => key.toLowerCase() === "content-type");
  if (!hasContentType) {
    nextHeaders["Content-Type"] = "application/json";
  }
  return { ...init, headers: nextHeaders };
}

function observedSurface(
  operation: (typeof WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES)[number]["operation"]
): WorkbenchAnalyticsUiObservationContext {
  return WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES.find(
    (surface) => surface.operation === operation
  )!;
}

async function observeWorkbenchResource<T>(
  operation: (typeof WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES)[number]["operation"],
  request: () => Promise<T>,
  options?: WorkbenchAnalyticsUiObservationOptions
): Promise<T> {
  return await observeWorkbenchAnalyticsRequest(
    observedSurface(operation),
    request,
    options
  );
}

async function observeWorkbenchMutation<T>(
  operation: (typeof WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES)[number]["operation"],
  request: () => Promise<T>
): Promise<T> {
  return await observeWorkbenchResource(operation, request, {
    recordPanelHydration: false,
  });
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

function buildServerGatewayHeaders(initialHeaders?: HeadersInit): Headers {
  const headers = buildAnalyticsUiCorrelationHeaders(initialHeaders);
  applyDefaultCallerContextHeaders(headers);
  return headers;
}

async function fetchWorkbenchResource<T>(
  target: WorkbenchRequestTarget,
  path: string,
  errorLabel: string,
  query?: URLSearchParams | string
): Promise<T> {
  return await fetchWorkbenchJson<T>(
    buildWorkbenchUrl(target, path, query),
    errorLabel,
    target === "client"
      ? { headers: buildAnalyticsUiCorrelationHeaders() }
      : { headers: buildServerGatewayHeaders() }
  );
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
  return await observeWorkbenchResource(
    "workbench.overview",
    async () =>
      await fetchWorkbenchResource<WorkbenchOverview>(
        "server",
        `/workbench/${portfolioId}/overview`,
        "overview"
      )
  );
}

export async function getPortfolio360(
  portfolioId: string,
  sessionId?: string
): Promise<WorkbenchPortfolio360> {
  const query = sessionId
    ? new URLSearchParams({ session_id: sessionId })
    : undefined;
  return await observeWorkbenchResource(
    "workbench.portfolio-360",
    async () =>
      await fetchWorkbenchResource<WorkbenchPortfolio360>(
        "server",
        `/workbench/${portfolioId}/portfolio-360`,
        "portfolio 360",
        query
      )
  );
}

export async function createSandboxSession(
  portfolioId: string,
  payload: { created_by?: string; ttl_hours?: number }
): Promise<WorkbenchSandboxState> {
  return await observeWorkbenchMutation(
    "workbench.sandbox-session.create",
    async () =>
      await fetchWorkbenchMutation<WorkbenchSandboxState>(
        `${BFF_PROXY_BASE}/workbench/${portfolioId}/sandbox/sessions`,
        "create sandbox session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
  );
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
  return await observeWorkbenchMutation(
    "workbench.sandbox-session.apply",
    async () =>
      await fetchWorkbenchMutation<WorkbenchSandboxState>(
        `${BFF_PROXY_BASE}/workbench/${portfolioId}/sandbox/sessions/${sessionId}/changes`,
        "apply sandbox changes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
  );
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
  return await observeWorkbenchResource(
    "workbench.analytics",
    async () =>
      await fetchWorkbenchResource<WorkbenchAnalytics>(
        "server",
        `/workbench/${portfolioId}/analytics`,
        "workbench analytics",
        query
      )
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
  return await observeWorkbenchResource(
    "performance.workspace.summary",
    async () =>
      await fetchWorkbenchJson<WorkbenchPerformanceWorkspaceSummary>(
        buildPerformanceWorkspaceUrl(portfolioId, params, "/summary", "server"),
        "performance workspace summary",
        { headers: buildServerGatewayHeaders() }
      )
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
    "performance workspace details",
    { headers: buildServerGatewayHeaders() }
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
  return await observeWorkbenchAnalyticsRequest(
    observedSurface("performance.workspace.summary"),
    async () =>
      await fetchWorkbenchJson<WorkbenchPerformanceWorkspaceSummary>(
        buildPerformanceWorkspaceUrl(portfolioId, params, "/summary", "client"),
        "performance workspace summary",
        { headers: buildAnalyticsUiCorrelationHeaders() }
      )
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
  return await observeWorkbenchAnalyticsRequest(
    observedSurface("performance.workspace.details"),
    async () =>
      await fetchWorkbenchJson<WorkbenchPerformanceWorkspaceDetails>(
        buildPerformanceWorkspaceUrl(portfolioId, params, "/details", "client"),
        "performance workspace details",
        { headers: buildAnalyticsUiCorrelationHeaders() }
      )
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
  return await observeWorkbenchResource(
    "performance.workspace.horizon-comparison",
    async () =>
      await fetchWorkbenchResource<WorkbenchPerformanceHorizonComparison>(
        "client",
        `/workbench/${portfolioId}/performance/horizon-comparison`,
        "performance horizon comparison",
        query
      )
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
  return await observeWorkbenchResource(
    "performance.workspace.attribution-trend",
    async () =>
      await fetchWorkbenchResource<WorkbenchPerformanceAttributionTrend>(
        "client",
        `/workbench/${portfolioId}/performance/attribution-trend`,
        "performance attribution trend",
        query
      )
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
  return await observeWorkbenchResource(
    "performance.workspace.advisor-brief",
    async () =>
      await fetchWorkbenchResource<WorkbenchPerformanceAdvisorBrief>(
        "client",
        `/workbench/${portfolioId}/performance/advisor-brief`,
        "performance advisor brief",
        buildPerformanceWorkspaceQuery(params)
      )
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
  return await observeWorkbenchMutation(
    "performance.workspace.advisor-brief.review-action",
    async () =>
      await fetchWorkbenchMutation<WorkbenchPerformanceAdvisorBrief>(
        buildWorkbenchUrl(
          "client",
          `/workbench/${portfolioId}/performance/advisor-brief/review-actions`,
          buildPerformanceWorkspaceQuery(params)
        ),
        "performance advisor brief review action",
        {
          method: "POST",
          headers: buildAnalyticsUiCorrelationHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        }
      )
  );
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
  return await observeWorkbenchAnalyticsRequest(
    observedSurface("risk.summary"),
    async () =>
      await fetchWorkbenchJson<WorkbenchRiskSummaryResponse>(
        buildRiskWorkspaceUrl(portfolioId, "/risk/summary", params, "client"),
        "workbench risk summary",
        { headers: buildAnalyticsUiCorrelationHeaders() }
      )
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
  return await observeWorkbenchResource(
    "risk.concentration",
    async () =>
      await fetchWorkbenchJson<WorkbenchRiskConcentrationResponse>(
        buildRiskWorkspaceUrl(portfolioId, "/risk/concentration", params, "client"),
        "workbench risk concentration",
        { headers: buildAnalyticsUiCorrelationHeaders() }
      )
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
  return await observeWorkbenchResource(
    "risk.drawdown",
    async () =>
      await fetchWorkbenchJson<WorkbenchRiskDrawdownResponse>(
        buildWorkbenchUrl("client", `/workbench/${portfolioId}/risk/drawdown`, query),
        "workbench risk drawdown",
        { headers: buildAnalyticsUiCorrelationHeaders() }
      )
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
  return await observeWorkbenchResource(
    "risk.rolling",
    async () =>
      await fetchWorkbenchJson<WorkbenchRiskRollingResponse>(
        buildWorkbenchUrl("client", `/workbench/${portfolioId}/risk/rolling`, query),
        "workbench risk rolling",
        { headers: buildAnalyticsUiCorrelationHeaders() }
      )
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
  return await observeWorkbenchResource(
    "risk.attribution",
    async () =>
      await fetchWorkbenchJson<WorkbenchRiskAttributionResponse>(
        buildWorkbenchUrl("client", `/workbench/${portfolioId}/risk/attribution`, query),
        "workbench risk attribution",
        { headers: buildAnalyticsUiCorrelationHeaders() }
      )
  );
}

export async function getReportingSnapshot(
  portfolioId: string,
  asOfDate: string
): Promise<WorkbenchReportingSnapshot> {
  const query = new URLSearchParams();
  query.set("asOfDate", asOfDate);
  return await observeWorkbenchResource(
    "workbench.reporting-snapshot",
    async () =>
      await fetchWorkbenchResource<WorkbenchReportingSnapshot>(
        "server",
        `/reports/${portfolioId}/snapshot`,
        "reporting snapshot",
        query
      )
  );
}

export async function getDpmCommandCenter(params?: {
  tenantId?: string;
  portfolioManagerId?: string;
  bookId?: string;
  asOfDate?: string;
  healthState?: string;
  limit?: number;
}): Promise<DpmCommandCenterGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const query = new URLSearchParams();
  query.set("tenant_id", params?.tenantId ?? dpmContext.commandCenterTenantId);
  query.set(
    "portfolio_manager_id",
    params?.portfolioManagerId ?? dpmContext.commandCenterPortfolioManagerId
  );
  query.set("book_id", params?.bookId ?? dpmContext.commandCenterBookId);
  query.set("as_of_date", params?.asOfDate ?? dpmContext.commandCenterAsOfDate);
  query.set("limit", String(params?.limit ?? 25));
  if (params?.healthState) {
    query.set("health_state", params.healthState);
  }
  return await observeWorkbenchResource(
    "dpm.command-center.summary",
    async () =>
      await fetchWorkbenchResource<DpmCommandCenterGatewayResponse>(
        "server",
        "/dpm/command-center",
        "DPM command center",
        query
      )
  );
}

export async function runDpmCommandCenterMonitoring(params?: {
  mandateIds?: string[];
  tenantId?: string;
  portfolioManagerId?: string;
  bookId?: string;
  asOfDate?: string;
  requestedBy?: string;
}): Promise<DpmCommandCenterGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const callerContext = resolveDefaultCallerContext();
  const mandateIds = params?.mandateIds?.length
    ? params.mandateIds
    : [dpmContext.mandateId];
  const asOfDate = params?.asOfDate ?? dpmContext.commandCenterAsOfDate;
  return await observeWorkbenchMutation(
    "dpm.command-center.monitoring.run-once",
    async () =>
      await fetchWorkbenchMutation<DpmCommandCenterGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/monitoring/run-once"),
        "run DPM command-center monitoring",
        {
          method: "POST",
          headers: buildDpmCommandCenterCallerHeaders({
            actorId: params?.requestedBy ?? callerContext.actorId,
            correlationId: `corr-workbench-command-center-run-${asOfDate}`,
          }),
          body: JSON.stringify({
            body: {
              mandate_ids: mandateIds,
              as_of_date: asOfDate,
              tenant_id: params?.tenantId ?? dpmContext.commandCenterTenantId,
              portfolio_manager_id:
                params?.portfolioManagerId ??
                dpmContext.commandCenterPortfolioManagerId,
              book_id: params?.bookId ?? dpmContext.commandCenterBookId,
              requested_by: params?.requestedBy ?? callerContext.actorId,
            },
          }),
        }
      )
  );
}

export async function getDpmCommandCenterExceptions(params?: {
  tenantId?: string;
  portfolioManagerId?: string;
  monitoringRunId?: string;
  state?: string;
  severity?: string;
  limit?: number;
}): Promise<DpmCommandCenterGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const query = new URLSearchParams();
  query.set("tenant_id", params?.tenantId ?? dpmContext.commandCenterTenantId);
  query.set(
    "portfolio_manager_id",
    params?.portfolioManagerId ?? dpmContext.commandCenterPortfolioManagerId
  );
  query.set("limit", String(params?.limit ?? 25));
  if (params?.monitoringRunId) {
    query.set("monitoring_run_id", params.monitoringRunId);
  }
  if (params?.state) {
    query.set("state", params.state);
  }
  if (params?.severity) {
    query.set("severity", params.severity);
  }
  return await observeWorkbenchResource(
    "dpm.command-center.exceptions.list",
    async () =>
      await fetchWorkbenchResource<DpmCommandCenterGatewayResponse>(
        "server",
        "/dpm/command-center/exceptions",
        "DPM command-center exceptions",
        query
      )
  );
}

export async function getDpmMandateByPortfolio(
  portfolioId: string
): Promise<DpmCommandCenterGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.command-center.mandate.by-portfolio",
    async () =>
      await fetchWorkbenchResource<DpmCommandCenterGatewayResponse>(
        "server",
        `/dpm/command-center/mandates/by-portfolio/${encodeURIComponent(portfolioId)}`,
        "DPM mandate by portfolio"
      )
  );
}

export async function getDpmMandateHealth(
  mandateId: string
): Promise<DpmCommandCenterGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.command-center.mandate.health",
    async () =>
      await fetchWorkbenchResource<DpmCommandCenterGatewayResponse>(
        "server",
        `/dpm/command-center/mandates/${encodeURIComponent(mandateId)}/health`,
        "DPM mandate health"
      )
  );
}

export async function getDpmOutcomeReviews(params: {
  portfolioId: string;
  state?: string;
  limit?: number;
  cursor?: string;
}): Promise<DpmOutcomeReviewGatewayResponse> {
  const query = new URLSearchParams();
  query.set("portfolio_id", params.portfolioId);
  query.set("limit", String(params.limit ?? 10));
  if (params.state) {
    query.set("state", params.state);
  }
  if (params.cursor) {
    query.set("cursor", params.cursor);
  }
  return await observeWorkbenchResource(
    "dpm.outcome-reviews.list",
    async () =>
      await fetchWorkbenchResource<DpmOutcomeReviewGatewayResponse>(
        "server",
        "/dpm/command-center/outcome-reviews",
        "DPM outcome reviews",
        query
      )
  );
}

export async function generateDpmConstructionAlternatives(params: {
  portfolio: WorkbenchPortfolio360;
  methods?: string[];
  actorId?: string;
}): Promise<DpmConstructionGatewayResponse> {
  const portfolioId = params.portfolio.portfolio.portfolio_id;
  const actorId = params.actorId ?? "workbench-construction-operator";
  const methods = params.methods ?? [
    "DO_NOTHING_BASELINE",
    "HEURISTIC_EXPLAINABLE",
    "MIN_TURNOVER",
  ];
  const requestBody = buildConstructionAlternativeSetRequest(
    params.portfolio,
    methods
  );
  const statefulInput = requestBody.stateful_input as
    | { as_of?: unknown }
    | undefined;
  const constructionAsOf =
    typeof statefulInput?.as_of === "string"
      ? statefulInput.as_of
      : params.portfolio.as_of_date;
  return await observeWorkbenchMutation(
    "dpm.construction.alternatives.generate",
    async () =>
      await fetchWorkbenchMutation<DpmConstructionGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/construction/alternative-sets/generate"),
        "generate DPM construction alternatives",
        {
          method: "POST",
          headers: buildDpmConstructionCallerHeaders({
            actorId,
            correlationId: `corr-workbench-construction-${portfolioId}-${constructionAsOf}`,
          }),
          body: JSON.stringify({
            idempotency_key: `workbench-construction-${portfolioId}-${constructionAsOf}`,
            body: requestBody,
          }),
        }
      )
  );
}

export async function getDpmConstructionAlternativeSet(
  alternativeSetId: string
): Promise<DpmConstructionGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.construction.alternative-set.get",
    async () =>
      await fetchWorkbenchResource<DpmConstructionGatewayResponse>(
        "client",
        `/dpm/command-center/construction/alternative-sets/${encodeURIComponent(alternativeSetId)}`,
        "DPM construction alternative set"
      )
  );
}

export async function selectDpmConstructionAlternative(params: {
  alternativeSetId: string;
  alternativeId: string;
  actorId?: string;
  reasonCode?: string;
  comment?: string;
}): Promise<DpmConstructionGatewayResponse> {
  const actorId = params.actorId ?? "workbench-construction-operator";
  return await observeWorkbenchMutation(
    "dpm.construction.alternative.select",
    async () =>
      await fetchWorkbenchMutation<DpmConstructionGatewayResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/construction/alternative-sets/${encodeURIComponent(params.alternativeSetId)}/selections`
        ),
        "select DPM construction alternative",
        {
          method: "POST",
          headers: buildDpmConstructionCallerHeaders({
            actorId,
            correlationId: `corr-workbench-construction-select-${params.alternativeSetId}`,
          }),
          body: JSON.stringify({
            body: {
              alternative_id: params.alternativeId,
              actor_id: actorId,
              reason_code: params.reasonCode ?? "PM_SELECTED_WORKBENCH_CONSTRUCTION_ALTERNATIVE",
              comment: params.comment ?? "Selected from Workbench construction lab.",
            },
          }),
        }
      )
  );
}

export async function getDpmOutcomeReviewReportInput(
  outcomeReviewId: string
): Promise<DpmOutcomeReviewHandoffResponse> {
  return await observeWorkbenchResource(
    "dpm.outcome-review.report-input",
    async () =>
      await fetchWorkbenchResource<DpmOutcomeReviewHandoffResponse>(
        "client",
        `/dpm/command-center/outcome-reviews/${encodeURIComponent(outcomeReviewId)}/report-input`,
        "DPM outcome review report input"
      )
  );
}

export async function getDpmOutcomeReviewAiEvidenceInput(
  outcomeReviewId: string
): Promise<DpmOutcomeReviewHandoffResponse> {
  return await observeWorkbenchResource(
    "dpm.outcome-review.ai-evidence",
    async () =>
      await fetchWorkbenchResource<DpmOutcomeReviewHandoffResponse>(
        "client",
        `/dpm/command-center/outcome-reviews/${encodeURIComponent(outcomeReviewId)}/ai-evidence-input`,
        "DPM outcome review AI evidence input"
      )
  );
}

export async function generateDpmProofPackFromRun(params: {
  rebalanceRunId: string;
  mandateId?: string | null;
  actorId?: string;
  reason?: string;
  includeMarkdown?: boolean;
  includeReportInput?: boolean;
  includeAiEvidenceInput?: boolean;
}): Promise<DpmProofPackGatewayResponse> {
  const actorId = params.actorId ?? "workbench-proof-pack-operator";
  return await observeWorkbenchMutation(
    "dpm.proof-pack.generate",
    async () =>
      await fetchWorkbenchMutation<DpmProofPackGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/proof-packs"),
        "generate DPM proof pack",
        {
          method: "POST",
          headers: buildDpmProofPackCallerHeaders({
            actorId,
            correlationId: `corr-workbench-proof-pack-${params.rebalanceRunId}`,
          }),
          body: JSON.stringify({
            idempotency_key: `workbench-proof-pack-${params.rebalanceRunId}`,
            body: {
              source_type: "REBALANCE_RUN",
              rebalance_run_id: params.rebalanceRunId,
              mandate_id: params.mandateId ?? undefined,
              include_markdown: params.includeMarkdown ?? true,
              include_report_input: params.includeReportInput ?? true,
              include_ai_evidence_input: params.includeAiEvidenceInput ?? true,
              actor_id: actorId,
              reason:
                params.reason ??
                "Workbench PM generated proof pack from Gateway-backed rebalance run.",
            },
          }),
        }
      )
  );
}

export async function getDpmProofPack(
  proofPackId: string,
  target: WorkbenchRequestTarget = "client"
): Promise<DpmProofPackGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.proof-pack.get",
    async () =>
      await fetchWorkbenchResource<DpmProofPackGatewayResponse>(
        target,
        `/dpm/command-center/proof-packs/${encodeURIComponent(proofPackId)}`,
        "DPM proof pack"
      )
  );
}

export async function getDpmProofPackMarkdown(
  proofPackId: string
): Promise<DpmProofPackMarkdownResponse> {
  return await observeWorkbenchResource(
    "dpm.proof-pack.markdown",
    async () =>
      await fetchWorkbenchResource<DpmProofPackMarkdownResponse>(
        "client",
        `/dpm/command-center/proof-packs/${encodeURIComponent(proofPackId)}/summary.md`,
        "DPM proof pack Markdown"
      )
  );
}

export async function getDpmProofPackReportInput(
  proofPackId: string
): Promise<DpmProofPackGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.proof-pack.report-input",
    async () =>
      await fetchWorkbenchResource<DpmProofPackGatewayResponse>(
        "client",
        `/dpm/command-center/proof-packs/${encodeURIComponent(proofPackId)}/report-input`,
        "DPM proof pack report input"
      )
  );
}

export async function getDpmProofPackAiEvidenceInput(
  proofPackId: string
): Promise<DpmProofPackGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.proof-pack.ai-evidence",
    async () =>
      await fetchWorkbenchResource<DpmProofPackGatewayResponse>(
        "client",
        `/dpm/command-center/proof-packs/${encodeURIComponent(proofPackId)}/ai-evidence-input`,
        "DPM proof pack AI evidence input"
      )
  );
}

export async function requestDpmOutcomeReviewAiNarrative(params: {
  outcomeReviewId: string;
  requestedOutputs?: string[];
  audience?: string[];
}): Promise<DpmOutcomeReviewNarrativeResponse> {
  return await observeWorkbenchMutation(
    "dpm.outcome-review.ai-narrative",
    async () =>
      await fetchWorkbenchMutation<DpmOutcomeReviewNarrativeResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/outcome-reviews/${encodeURIComponent(params.outcomeReviewId)}/ai-narrative`
        ),
        "request DPM outcome review AI narrative",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-Id": `corr-workbench-outcome-ai-${params.outcomeReviewId}`,
          },
          body: JSON.stringify({
            requested_outputs: params.requestedOutputs ?? [
              "pm_summary",
              "cio_summary",
              "control_summary",
              "evidence_gaps",
            ],
            audience: params.audience ?? [
              "portfolio_manager",
              "cio_office",
              "investment_control",
            ],
          }),
        }
      )
  );
}

export async function submitDpmOutcomeReviewReportJob(params: {
  outcomeReviewId: string;
  outcomeReportInput: Record<string, unknown>;
  requestedOutputFormats?: string[];
  tenantId?: string;
  region?: string;
  bookingCenterCode?: string | null;
  actorId?: string;
}): Promise<ReportJobHandleResponse> {
  const tenantId = params.tenantId ?? "tenant-sg";
  const region = params.region ?? "APAC";
  const actorId = params.actorId ?? "workbench-outcome-review-operator";
  const idempotencyKey = `outcome-review-${params.outcomeReviewId}-pdf`;
  return await observeWorkbenchMutation(
    "dpm.outcome-review.report-job.submit",
    async () =>
      await fetchWorkbenchMutation<ReportJobHandleResponse>(
        buildWorkbenchUrl("client", "/reports/outcome-reviews"),
        "submit outcome-review report job",
        {
          method: "POST",
          headers: {
            ...buildReportBatchCallerHeaders({
              actorId,
              tenantId,
              region,
              bookingCenterCode: params.bookingCenterCode,
              correlationId: `corr-workbench-outcome-report-${params.outcomeReviewId}`,
            }),
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            outcome_report_input: params.outcomeReportInput,
            requested_output_formats: params.requestedOutputFormats ?? ["pdf"],
            options: { retention_policy_id: "generated-report-standard" },
          }),
        }
      )
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

function buildDpmConstructionCallerHeaders(params: {
  actorId: string;
  correlationId: string;
}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Actor-Id": params.actorId,
    "X-Caller-Application": "lotus-workbench",
    "X-Correlation-Id": params.correlationId,
  };
}

function buildDpmCommandCenterCallerHeaders(params: {
  actorId: string;
  correlationId: string;
}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Actor-Id": params.actorId,
    "X-Caller-Application": "lotus-workbench",
    "X-Correlation-Id": params.correlationId,
  };
}

function buildDpmProofPackCallerHeaders(params: {
  actorId: string;
  correlationId: string;
}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Actor-Id": params.actorId,
    "X-Caller-Application": "lotus-workbench",
    "X-Correlation-Id": params.correlationId,
  };
}

function buildConstructionAlternativeSetRequest(
  portfolio: WorkbenchPortfolio360,
  methods: string[]
): Record<string, unknown> {
  const portfolioId = portfolio.portfolio.portfolio_id;
  const baseCurrency = portfolio.portfolio.base_currency;
  const callerContext = resolveDefaultCallerContext();
  const dpmContext = resolveDefaultDpmContext();
  const sourceAsOfDate = dpmContext.sourceAsOfDate || portfolio.as_of_date;
  return {
    input_mode: "stateful",
    methods,
    stateful_input: {
      portfolio_id: portfolioId,
      as_of: sourceAsOfDate,
      mandate_id: dpmContext.mandateId,
      model_portfolio_id: dpmContext.modelPortfolioId,
      tenant_id: callerContext.tenantId,
      booking_center_code:
        dpmContext.bookingCenterCode ||
        portfolio.portfolio.booking_center_code ||
        callerContext.bookingCenterCode,
      include_tax_lots: true,
      include_settlement_profile: true,
      include_shelf: true,
      include_model_portfolio: true,
    },
    options_override: {
      valuation_mode: "TRUST_SNAPSHOT",
      cash_band_min_weight: "0.00",
      cash_band_max_weight: "0.15",
      min_trade_notional: {
        amount: "100",
        currency: baseCurrency,
      },
    },
  };
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

  return await observeWorkbenchMutation(
    "reporting.report-batch.create",
    async () =>
      await fetchWorkbenchMutation<ReportBatchHandleResponse>(
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
      )
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
  return await observeWorkbenchResource(
    "reporting.report-batch.status",
    async () =>
      await fetchWorkbenchMutation<ReportBatchStatusResponse>(
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
      )
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
  return await observeWorkbenchMutation(
    "reporting.report-batch.run-once",
    async () =>
      await fetchWorkbenchMutation<ReportBatchWorkerRunResponse>(
        buildWorkbenchUrl(
          "client",
          `/report-batches/${encodeURIComponent(params.batchId)}:run-once`
        ),
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
      )
  );
}

export async function getArchivedDocumentMetadata(
  documentId: string,
  params: {
    current?: boolean;
    tenantId?: string;
    region?: string;
    bookingCenterCode?: string | null;
    actorId?: string;
  } = {}
): Promise<ArchivedDocumentMetadataResponse> {
  const tenantId = params.tenantId ?? "tenant-sg";
  const region = params.region ?? "APAC";
  const actorId = params.actorId ?? "workbench-report-operator";
  const query = new URLSearchParams();
  if (params.current) {
    query.set("current", "true");
  }

  return await observeWorkbenchResource(
    "reporting.archive-document.metadata",
    async () =>
      await fetchWorkbenchMutation<ArchivedDocumentMetadataResponse>(
        buildWorkbenchUrl("client", `/documents/${encodeURIComponent(documentId)}`, query),
        "load archived document metadata",
        {
          method: "GET",
          headers: buildReportBatchCallerHeaders({
            actorId,
            tenantId,
            region,
            bookingCenterCode: params.bookingCenterCode,
            correlationId: "corr-workbench-archive-document-metadata",
          }),
        }
      )
  );
}

export function buildArchivedDocumentDownloadUrl(documentId: string): string {
  return buildWorkbenchUrl("client", `/documents/${encodeURIComponent(documentId)}/download`);
}
