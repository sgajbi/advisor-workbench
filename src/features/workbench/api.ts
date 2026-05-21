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
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
  WorkbenchPortfolio360,
  DpmCommandCenterGatewayResponse,
  DpmExceptionSummaryResponse,
  DpmPortfolioMemoryGatewayResponse,
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
export * from "@/features/workbench/dpm-wave-api";
export * from "@/features/workbench/risk-api";

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
