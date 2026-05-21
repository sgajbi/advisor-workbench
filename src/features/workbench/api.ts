import {
  CompositePerformanceGatewayResponse,
  CompositePerformanceInspectionRequest,
  CompositePerformanceTwrRequest,
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
  DpmCampaignDefinitionGatewayResponse,
  DpmExceptionSummaryResponse,
  DpmOperationsHandoffSummaryResponse,
  DpmPortfolioMemoryGatewayResponse,
  DpmWaveAiPmMemoResponse,
  DpmWaveGatewayResponse,
  WorkbenchReportingSnapshot,
  WorkbenchSandboxState,
} from "./types";
import {
  resolveDefaultCallerContext,
  resolveDefaultDpmContext,
} from "./caller-context";
import { buildAnalyticsUiCorrelationHeaders } from "@/features/analytics-observability/correlation";
import {
  BFF_PROXY_BASE,
  buildServerGatewayHeaders,
  buildWorkbenchUrl,
  fetchWorkbenchJson,
  fetchWorkbenchMutation,
  fetchWorkbenchResource,
  observeWorkbenchMutation,
  observeWorkbenchResource,
  type WorkbenchObservedOperation,
  type WorkbenchRequestTarget,
} from "@/features/workbench/api-client";

export {
  WorkbenchApiError,
  getWorkbenchApiErrorStatus,
  isWorkbenchPermissionBlockedError,
} from "@/features/workbench/api-client";
export * from "@/features/workbench/pm-operating-quality-api";
export * from "@/features/workbench/proof-pack-api";
export * from "@/features/workbench/outcome-review-api";
export * from "@/features/workbench/reporting-api";
export * from "@/features/workbench/construction-api";

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
  return await observeWorkbenchResource(
    "performance.workspace.summary",
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
  return await observeWorkbenchResource(
    "performance.workspace.details",
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

export async function calculateCompositePerformanceTwrClient(
  payload: CompositePerformanceTwrRequest
): Promise<CompositePerformanceGatewayResponse> {
  return await observeWorkbenchMutation(
    "performance.composites.twr",
    async () =>
      await fetchWorkbenchMutation<CompositePerformanceGatewayResponse>(
        `${BFF_PROXY_BASE}/performance/composites/twr`,
        "composite performance TWR",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
  );
}

export async function inspectCompositePerformanceClient(
  payload: CompositePerformanceInspectionRequest
): Promise<CompositePerformanceGatewayResponse> {
  return await observeWorkbenchMutation(
    "performance.composites.inspect",
    async () =>
      await fetchWorkbenchMutation<CompositePerformanceGatewayResponse>(
        `${BFF_PROXY_BASE}/performance/composites/inspect`,
        "composite performance inspection",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
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
  reportStartDate?: string;
  reportEndDate?: string;
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
  if (params.reportStartDate) {
    query.set("report_start_date", params.reportStartDate);
  }
  if (params.reportEndDate) {
    query.set("report_end_date", params.reportEndDate);
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
    reportStartDate?: string;
    reportEndDate?: string;
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
    reportStartDate?: string;
    reportEndDate?: string;
    asOfDate?: string;
    reportingCurrency?: string;
  }
): Promise<WorkbenchRiskSummaryResponse> {
  return await observeWorkbenchResource(
    "risk.summary",
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
    reportStartDate?: string;
    reportEndDate?: string;
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
    reportStartDate?: string;
    reportEndDate?: string;
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
      reportStartDate: params.reportStartDate,
      reportEndDate: params.reportEndDate,
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
    reportStartDate?: string;
    reportEndDate?: string;
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
      reportStartDate: params.reportStartDate,
      reportEndDate: params.reportEndDate,
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
    reportStartDate?: string;
    reportEndDate?: string;
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
      reportStartDate: params.reportStartDate,
      reportEndDate: params.reportEndDate,
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
  const mandateIds = params?.mandateIds ?? [];
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

export async function requestDpmExceptionSummary(params: {
  exceptionId: string;
  portfolioId?: string;
  mandateId?: string;
  state?: string;
}): Promise<DpmExceptionSummaryResponse> {
  const body: Record<string, unknown> = {
    requested_outputs: [
      "exception_summary",
      "severity_summary",
      "recommended_triage",
      "support_references",
      "evidence_gaps",
    ],
    audience: ["portfolio_manager", "investment_control", "operations"],
  };
  if (params.portfolioId) {
    body.portfolio_id = params.portfolioId;
  }
  if (params.mandateId) {
    body.mandate_id = params.mandateId;
  }
  if (params.state) {
    body.state = params.state;
  }

  return await observeWorkbenchMutation(
    "dpm.command-center.exceptions.ai-summary",
    async () =>
      await fetchWorkbenchMutation<DpmExceptionSummaryResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/exceptions/${encodeURIComponent(params.exceptionId)}/ai-summary`
        ),
        "request DPM exception AI summary",
        {
          method: "POST",
          headers: buildDpmWaveCallerHeaders(),
          body: JSON.stringify(body),
        }
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

export async function getDpmPortfolioMemory(params: {
  portfolioId: string;
  limit?: number;
}): Promise<DpmPortfolioMemoryGatewayResponse> {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 100));
  return await observeWorkbenchResource(
    "dpm.portfolio-memory.get",
    async () =>
      await fetchWorkbenchResource<DpmPortfolioMemoryGatewayResponse>(
        "server",
        `/dpm/command-center/portfolios/${encodeURIComponent(params.portfolioId)}/memory`,
        "DPM portfolio memory",
        query
      )
  );
}

export async function listDpmWaves(params?: {
  state?: string;
  triggerType?: string;
  asOfDate?: string;
  supportabilityState?: string;
  limit?: number;
  offset?: number;
}): Promise<DpmWaveGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const query = new URLSearchParams();
  query.set("trigger_type", params?.triggerType ?? "EXPLICIT_PORTFOLIO_LIST");
  query.set("as_of_date", params?.asOfDate ?? dpmContext.commandCenterAsOfDate);
  query.set("limit", String(params?.limit ?? 10));
  query.set("offset", String(params?.offset ?? 0));
  if (params?.state) {
    query.set("state", params.state);
  }
  if (params?.supportabilityState) {
    query.set("supportability_state", params.supportabilityState);
  }
  return await observeWorkbenchResource(
    "dpm.waves.list",
    async () =>
      await fetchWorkbenchResource<DpmWaveGatewayResponse>(
        "server",
        "/dpm/command-center/waves",
        "DPM rebalance waves",
        query
      )
  );
}

export async function listDpmCampaignDefinitions(params?: {
  campaignId?: string;
  campaignStatus?: "ACTIVE" | "RETIRED";
  limit?: number;
  offset?: number;
}): Promise<DpmCampaignDefinitionGatewayResponse> {
  const query = new URLSearchParams();
  query.set("limit", String(params?.limit ?? 10));
  query.set("offset", String(params?.offset ?? 0));
  if (params?.campaignId) {
    query.set("campaign_id", params.campaignId);
  }
  if (params?.campaignStatus) {
    query.set("campaign_status", params.campaignStatus);
  }
  return await observeWorkbenchResource(
    "dpm.waves.campaign-definitions.list",
    async () =>
      await fetchWorkbenchResource<DpmCampaignDefinitionGatewayResponse>(
        "server",
        "/dpm/command-center/waves/campaign-definitions",
        "DPM campaign definitions",
        query
      )
  );
}

export async function listDpmCampaignDiscovery(params?: {
  campaignId?: string;
  campaignStatus?: "ACTIVE" | "RETIRED" | "SUPERSEDED";
  asOfDate?: string;
  activeOn?: string;
  includeExpired?: boolean;
  limit?: number;
  offset?: number;
}): Promise<DpmCampaignDefinitionGatewayResponse> {
  const query = new URLSearchParams();
  query.set("limit", String(params?.limit ?? 10));
  query.set("offset", String(params?.offset ?? 0));
  query.set("campaign_status", params?.campaignStatus ?? "ACTIVE");
  if (params?.campaignId) {
    query.set("campaign_id", params.campaignId);
  }
  if (params?.asOfDate) {
    query.set("as_of_date", params.asOfDate);
  }
  if (params?.activeOn) {
    query.set("active_on", params.activeOn);
  }
  if (params?.includeExpired !== undefined) {
    query.set("include_expired", String(params.includeExpired));
  }
  return await observeWorkbenchResource(
    "dpm.waves.campaign-discovery.list",
    async () =>
      await fetchWorkbenchResource<DpmCampaignDefinitionGatewayResponse>(
        "server",
        "/dpm/command-center/waves/campaign-discovery",
        "DPM campaign discovery",
        query
      )
  );
}

export async function getDpmCampaignDefinitionLifecycleEvents(params: {
  campaignId: string;
  campaignVersion: string;
}): Promise<DpmCampaignDefinitionGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.waves.campaign-definitions.lifecycle-events",
    async () =>
      await fetchWorkbenchResource<DpmCampaignDefinitionGatewayResponse>(
        "server",
        `/dpm/command-center/waves/campaign-definitions/${encodeURIComponent(
          params.campaignId
        )}/versions/${encodeURIComponent(params.campaignVersion)}/lifecycle-events`,
        "DPM campaign-definition lifecycle evidence"
      )
  );
}

export async function getDpmCampaignDefinitionPreviewReadiness(params: {
  campaignId: string;
  campaignVersion: string;
  requestedAsOfDate?: string;
  actorId?: string;
}): Promise<DpmCampaignDefinitionGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const callerContext = resolveDefaultCallerContext();
  const requestedAsOfDate = params.requestedAsOfDate ?? dpmContext.commandCenterAsOfDate;
  const actorId = params.actorId ?? callerContext.actorId;
  const query = new URLSearchParams();
  query.set("requested_as_of_date", requestedAsOfDate);
  query.set("actor_id", actorId);
  return await observeWorkbenchResource(
    "dpm.waves.campaign-definitions.preview-readiness",
    async () =>
      await fetchWorkbenchResource<DpmCampaignDefinitionGatewayResponse>(
        "client",
        `/dpm/command-center/waves/campaign-definitions/${encodeURIComponent(
          params.campaignId
        )}/versions/${encodeURIComponent(params.campaignVersion)}/preview-readiness`,
        "DPM campaign-definition preview readiness",
        query
      )
  );
}

export async function getDpmCampaignDefinitionLaunchHistory(params: {
  campaignId: string;
  campaignVersion: string;
  limit?: number;
  offset?: number;
}): Promise<DpmCampaignDefinitionGatewayResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    searchParams.set("offset", String(params.offset));
  }
  const query = searchParams.toString();
  return await observeWorkbenchResource(
    "dpm.waves.campaign-definitions.launch-history",
    async () =>
      await fetchWorkbenchResource<DpmCampaignDefinitionGatewayResponse>(
        "server",
        `/dpm/command-center/waves/campaign-definitions/${encodeURIComponent(
          params.campaignId
        )}/versions/${encodeURIComponent(params.campaignVersion)}/launch-history${
          query ? `?${query}` : ""
        }`,
        "DPM campaign-definition launch history"
      )
  );
}

export async function getDpmCampaignDefinitionLaunchPackage(params: {
  campaignId: string;
  campaignVersion: string;
  requestedAsOfDate?: string;
  actorId?: string;
  correlationId?: string;
}): Promise<DpmCampaignDefinitionGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const callerContext = resolveDefaultCallerContext();
  const requestedAsOfDate = params.requestedAsOfDate ?? dpmContext.commandCenterAsOfDate;
  const actorId = params.actorId ?? callerContext.actorId;
  const query = new URLSearchParams();
  query.set("requested_as_of_date", requestedAsOfDate);
  query.set("actor_id", actorId);
  if (params.correlationId) {
    query.set("correlation_id", params.correlationId);
  }
  return await observeWorkbenchResource(
    "dpm.waves.campaign-definitions.launch-package",
    async () =>
      await fetchWorkbenchResource<DpmCampaignDefinitionGatewayResponse>(
        "client",
        `/dpm/command-center/waves/campaign-definitions/${encodeURIComponent(
          params.campaignId
        )}/versions/${encodeURIComponent(params.campaignVersion)}/launch-package`,
        "DPM campaign-definition launch readiness",
        query
      )
  );
}

export async function launchDpmCampaignDefinition(params: {
  campaignId: string;
  campaignVersion: string;
  requestedAsOfDate?: string;
  actorId?: string;
  correlationId?: string;
}): Promise<DpmWaveGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const callerContext = resolveDefaultCallerContext();
  const requestedAsOfDate = params.requestedAsOfDate ?? dpmContext.commandCenterAsOfDate;
  const actorId = params.actorId ?? callerContext.actorId;
  const correlationId =
    params.correlationId ||
    ["workbench-campaign-launch", params.campaignId, params.campaignVersion, requestedAsOfDate].join(
      "-"
    );
  return await observeWorkbenchMutation(
    "dpm.waves.campaign-definitions.launch",
    async () =>
      await fetchWorkbenchMutation<DpmWaveGatewayResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/waves/campaign-definitions/${encodeURIComponent(
            params.campaignId
          )}/versions/${encodeURIComponent(params.campaignVersion)}/launch`
        ),
        "launch DPM campaign-definition wave",
        {
          method: "POST",
          headers: buildDpmWaveCallerHeaders(actorId),
          body: JSON.stringify({
            body: {
              requested_as_of_date: requestedAsOfDate,
              actor_id: actorId,
              correlation_id: correlationId,
            },
          }),
        }
      )
  );
}

export async function previewDpmWave(params: {
  portfolioId: string;
  asOfDate?: string;
  actorId?: string;
  rationale?: string;
}): Promise<DpmWaveGatewayResponse> {
  return await observeWorkbenchMutation(
    "dpm.waves.preview",
    async () =>
      await fetchWorkbenchMutation<DpmWaveGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/waves/preview"),
        "preview DPM rebalance wave",
        {
          method: "POST",
          headers: buildDpmWaveCallerHeaders(params.actorId),
          body: JSON.stringify({
            body: buildExplicitPortfolioWaveBody(params),
          }),
        }
      )
  );
}

export async function createDpmWave(params: {
  portfolioId: string;
  asOfDate?: string;
  actorId?: string;
  rationale?: string;
}): Promise<DpmWaveGatewayResponse> {
  const body = buildExplicitPortfolioWaveBody(params);
  return await observeWorkbenchMutation(
    "dpm.waves.create",
    async () =>
      await fetchWorkbenchMutation<DpmWaveGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/waves"),
        "create DPM rebalance wave",
        {
          method: "POST",
          headers: buildDpmWaveCallerHeaders(params.actorId),
          body: JSON.stringify({
            idempotency_key: [
              "workbench-wave",
              params.portfolioId,
              body.as_of_date,
            ].join("-"),
            body,
          }),
        }
      )
  );
}

export async function getDpmWave(waveId: string): Promise<DpmWaveGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.waves.get",
    async () =>
      await fetchWorkbenchResource<DpmWaveGatewayResponse>(
        "client",
        `/dpm/command-center/waves/${encodeURIComponent(waveId)}`,
        "DPM rebalance wave"
      )
  );
}

export async function getDpmWaveItems(waveId: string): Promise<DpmWaveGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.waves.items",
    async () =>
      await fetchWorkbenchResource<DpmWaveGatewayResponse>(
        "client",
        `/dpm/command-center/waves/${encodeURIComponent(waveId)}/items`,
        "DPM rebalance wave items"
      )
  );
}

export async function sourceCheckDpmWave(waveId: string): Promise<DpmWaveGatewayResponse> {
  return await observeWorkbenchMutation(
    "dpm.waves.source-check",
    async () =>
      await fetchWorkbenchMutation<DpmWaveGatewayResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/waves/${encodeURIComponent(waveId)}/source-check`
        ),
        "source-check DPM rebalance wave",
        {
          method: "POST",
          headers: buildDpmWaveCallerHeaders(),
          body: JSON.stringify({
            body: {
              actor_id: resolveDefaultCallerContext().actorId,
            },
          }),
        }
      )
  );
}

export async function simulateDpmWave(waveId: string): Promise<DpmWaveGatewayResponse> {
  return await observeWorkbenchMutation(
    "dpm.waves.simulate",
    async () =>
      await fetchWorkbenchMutation<DpmWaveGatewayResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/waves/${encodeURIComponent(waveId)}/simulate`
        ),
        "simulate DPM rebalance wave",
        {
          method: "POST",
          headers: buildDpmWaveCallerHeaders(),
          body: JSON.stringify({
            body: {
              actor_id: resolveDefaultCallerContext().actorId,
              methods: ["DO_NOTHING_BASELINE", "HEURISTIC_EXPLAINABLE", "MIN_TURNOVER"],
            },
          }),
        }
      )
  );
}

export async function approveDpmWave(waveId: string): Promise<DpmWaveGatewayResponse> {
  return await runDpmWaveWorkflowAction(
    waveId,
    "approve",
    "dpm.waves.approve",
    "approve DPM rebalance wave",
    buildDpmWaveWorkflowBody("PM_APPROVED_AFTER_PROOF_REVIEW")
  );
}

export async function stageDpmWave(waveId: string): Promise<DpmWaveGatewayResponse> {
  return await runDpmWaveWorkflowAction(
    waveId,
    "stage",
    "dpm.waves.stage",
    "stage DPM rebalance wave",
    buildDpmWaveWorkflowBody("READY_FOR_INTERNAL_OPERATIONS")
  );
}

export async function handoffDpmWave(waveId: string): Promise<DpmWaveGatewayResponse> {
  return await runDpmWaveWorkflowAction(
    waveId,
    "handoff",
    "dpm.waves.handoff",
    "handoff DPM rebalance wave",
    buildDpmWaveWorkflowBody("INTERNAL_HANDOFF_READY")
  );
}

export async function getDpmWaveProofPackPosture(
  waveId: string
): Promise<DpmWaveGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.waves.proof-pack",
    async () =>
      await fetchWorkbenchResource<DpmWaveGatewayResponse>(
        "client",
        `/dpm/command-center/waves/${encodeURIComponent(waveId)}/proof-pack`,
        "DPM rebalance wave proof-pack posture"
      )
  );
}

export async function getDpmWaveSupportability(
  waveId: string
): Promise<DpmWaveGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.waves.supportability",
    async () =>
      await fetchWorkbenchResource<DpmWaveGatewayResponse>(
        "client",
        `/dpm/command-center/waves/${encodeURIComponent(waveId)}/supportability`,
        "DPM rebalance wave supportability"
      )
  );
}

export async function getDpmWaveReportInput(waveId: string): Promise<DpmWaveGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.waves.report-input",
    async () =>
      await fetchWorkbenchResource<DpmWaveGatewayResponse>(
        "client",
        `/dpm/command-center/waves/${encodeURIComponent(waveId)}/report-input`,
        "DPM rebalance wave report input"
      )
  );
}

export async function requestDpmWaveAiPmMemo(waveId: string): Promise<DpmWaveAiPmMemoResponse> {
  return await observeWorkbenchMutation(
    "dpm.waves.ai-pm-memo",
    async () =>
      await fetchWorkbenchMutation<DpmWaveAiPmMemoResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/waves/${encodeURIComponent(waveId)}/ai-pm-memo`
        ),
        "request DPM rebalance wave AI PM memo",
        {
          method: "POST",
          headers: buildDpmWaveCallerHeaders(),
          body: JSON.stringify({
            requested_outputs: [
              "wave_pm_memo",
              "wave_rationale_summary",
              "approval_checklist",
              "risk_caveats",
              "operations_handoff",
              "evidence_gaps",
            ],
            audience: ["portfolio_manager", "investment_control", "operations"],
          }),
        }
      )
  );
}

export async function requestDpmOperationsHandoffSummary(
  waveId: string
): Promise<DpmOperationsHandoffSummaryResponse> {
  return await observeWorkbenchMutation(
    "dpm.waves.operations-handoff-summary",
    async () =>
      await fetchWorkbenchMutation<DpmOperationsHandoffSummaryResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/waves/${encodeURIComponent(waveId)}/operations-handoff-summary`
        ),
        "request DPM operations handoff AI summary",
        {
          method: "POST",
          headers: buildDpmWaveCallerHeaders(),
          body: JSON.stringify({
            requested_outputs: [
              "operations_summary",
              "execution_prerequisites",
              "blocking_conditions",
              "support_references",
              "evidence_gaps",
            ],
            audience: ["operations", "portfolio_manager", "investment_control"],
          }),
        }
      )
  );
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

function buildDpmWaveCallerHeaders(actorId?: string): Record<string, string> {
  const callerContext = resolveDefaultCallerContext();
  return {
    "Content-Type": "application/json",
    "X-Actor-Id": actorId ?? callerContext.actorId,
    "X-Caller-Application": "lotus-workbench",
    "X-Correlation-Id": "corr-workbench-dpm-wave",
  };
}

function buildExplicitPortfolioWaveBody(params: {
  portfolioId: string;
  asOfDate?: string;
  actorId?: string;
  rationale?: string;
}): {
  trigger_type: string;
  trigger_id: string;
  rationale: string;
  as_of_date: string;
  actor_id: string;
  portfolios: Array<{ portfolio_id: string }>;
} {
  const dpmContext = resolveDefaultDpmContext();
  const callerContext = resolveDefaultCallerContext();
  const asOfDate = params.asOfDate ?? dpmContext.commandCenterAsOfDate;
  return {
    trigger_type: "EXPLICIT_PORTFOLIO_LIST",
    trigger_id: `workbench-wave-${params.portfolioId}-${asOfDate}`,
    rationale:
      params.rationale ??
      "Workbench PM requested a Gateway-backed explicit portfolio-list rebalance wave.",
    as_of_date: asOfDate,
    actor_id: params.actorId ?? callerContext.actorId,
    portfolios: [{ portfolio_id: params.portfolioId }],
  };
}

function buildDpmWaveWorkflowBody(reasonCode: string): {
  actor_id: string;
  reason_code: string;
  comment: string;
} {
  return {
    actor_id: resolveDefaultCallerContext().actorId,
    reason_code: reasonCode,
    comment: "Workbench Gateway-backed rebalance-wave command-center action.",
  };
}

async function runDpmWaveWorkflowAction(
  waveId: string,
  actionPath: "approve" | "stage" | "handoff",
  operation: WorkbenchObservedOperation,
  label: string,
  body: Record<string, unknown>
): Promise<DpmWaveGatewayResponse> {
  return await observeWorkbenchMutation(
    operation,
    async () =>
      await fetchWorkbenchMutation<DpmWaveGatewayResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/waves/${encodeURIComponent(waveId)}/${actionPath}`
        ),
        label,
        {
          method: "POST",
          headers: buildDpmWaveCallerHeaders(),
          body: JSON.stringify({ body }),
        }
      )
  );
}
