import {
  WorkbenchAnalytics,
  WorkbenchPerformanceAttributionTrend,
  WorkbenchOverview,
  WorkbenchPerformanceHorizonComparison,
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
  WorkbenchPortfolio360,
  WorkbenchReportingSnapshot,
  WorkbenchSandboxState,
} from "./types";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";
const BFF_PROXY_BASE = "/api/bff/api/v1";

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
  baseUrl: string
): string {
  const query = buildPerformanceWorkspaceQuery(params);
  return `${baseUrl}/workbench/${portfolioId}/performance${pathSuffix}?${query}`;
}

export async function getWorkbenchOverview(portfolioId: string): Promise<WorkbenchOverview> {
  return await fetchWorkbenchJson<WorkbenchOverview>(
    `${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/overview`,
    "overview"
  );
}

export async function getPortfolio360(
  portfolioId: string,
  sessionId?: string
): Promise<WorkbenchPortfolio360> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
  return await fetchWorkbenchJson<WorkbenchPortfolio360>(
    `${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/portfolio-360${query}`,
    "portfolio 360"
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
  return await fetchWorkbenchJson<WorkbenchAnalytics>(
    `${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/analytics?${query.toString()}`,
    "workbench analytics"
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
    buildPerformanceWorkspaceUrl(portfolioId, params, "/summary", `${BFF_BASE_URL}/api/v1`),
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
    buildPerformanceWorkspaceUrl(portfolioId, params, "/details", `${BFF_BASE_URL}/api/v1`),
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
    buildPerformanceWorkspaceUrl(portfolioId, params, "/summary", BFF_PROXY_BASE),
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
    buildPerformanceWorkspaceUrl(portfolioId, params, "/details", BFF_PROXY_BASE),
    "performance workspace details"
  );
}

export async function getWorkbenchPerformanceHorizonComparisonClient(
  portfolioId: string,
  params: {
    detailBasis: string;
    benchmark?: string;
    chartFrequency?: string;
  }
): Promise<WorkbenchPerformanceHorizonComparison> {
  const query = new URLSearchParams();
  query.set("detail_basis", params.detailBasis);
  query.set("chart_frequency", params.chartFrequency ?? "monthly");
  if (params.benchmark) {
    query.set("benchmark_code", params.benchmark);
  }
  const response = await fetch(
    `${BFF_PROXY_BASE}/workbench/${portfolioId}/performance/horizon-comparison?${query.toString()}`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch performance horizon comparison (${response.status})`);
  }
  return (await response.json()) as WorkbenchPerformanceHorizonComparison;
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
  const response = await fetch(
    `${BFF_PROXY_BASE}/workbench/${portfolioId}/performance/attribution-trend?${query.toString()}`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch performance attribution trend (${response.status})`);
  }
  return (await response.json()) as WorkbenchPerformanceAttributionTrend;
}

export async function getReportingSnapshot(
  portfolioId: string,
  asOfDate: string
): Promise<WorkbenchReportingSnapshot> {
  const query = new URLSearchParams();
  query.set("asOfDate", asOfDate);
  return await fetchWorkbenchJson<WorkbenchReportingSnapshot>(
    `${BFF_BASE_URL}/api/v1/reports/${portfolioId}/snapshot?${query.toString()}`,
    "reporting snapshot"
  );
}
