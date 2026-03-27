import {
  WorkbenchAnalytics,
  WorkbenchOverview,
  WorkbenchPerformanceHorizonComparison,
  WorkbenchPerformanceWorkspaceDetails,
  WorkbenchPerformanceWorkspaceSummary,
  WorkbenchPerformanceWorkspace,
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

export async function getWorkbenchOverview(portfolioId: string): Promise<WorkbenchOverview> {
  const response = await fetch(`${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/overview`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch overview (${response.status})`);
  }

  return (await response.json()) as WorkbenchOverview;
}

export async function getPortfolio360(
  portfolioId: string,
  sessionId?: string
): Promise<WorkbenchPortfolio360> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
  const response = await fetch(`${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/portfolio-360${query}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch portfolio 360 (${response.status})`);
  }
  return (await response.json()) as WorkbenchPortfolio360;
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
  const response = await fetch(
    `${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/analytics?${query.toString()}`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch workbench analytics (${response.status})`);
  }
  return (await response.json()) as WorkbenchAnalytics;
}

export async function getWorkbenchPerformanceWorkspace(
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
): Promise<WorkbenchPerformanceWorkspace> {
  const query = buildPerformanceWorkspaceQuery(params);
  const response = await fetch(
    `${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/performance?${query}`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch performance workspace (${response.status})`);
  }
  return (await response.json()) as WorkbenchPerformanceWorkspace;
}

export async function getWorkbenchPerformanceWorkspaceClient(
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
): Promise<WorkbenchPerformanceWorkspace> {
  const query = buildPerformanceWorkspaceQuery(params);
  const response = await fetch(`${BFF_PROXY_BASE}/workbench/${portfolioId}/performance?${query}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch performance workspace (${response.status})`);
  }
  return (await response.json()) as WorkbenchPerformanceWorkspace;
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
  const query = buildPerformanceWorkspaceQuery(params);
  const response = await fetch(
    `${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/performance/summary?${query}`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch performance workspace summary (${response.status})`);
  }
  return (await response.json()) as WorkbenchPerformanceWorkspaceSummary;
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
  const query = buildPerformanceWorkspaceQuery(params);
  const response = await fetch(
    `${BFF_BASE_URL}/api/v1/workbench/${portfolioId}/performance/details?${query}`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch performance workspace details (${response.status})`);
  }
  return (await response.json()) as WorkbenchPerformanceWorkspaceDetails;
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
  const query = buildPerformanceWorkspaceQuery(params);
  const response = await fetch(
    `${BFF_PROXY_BASE}/workbench/${portfolioId}/performance/summary?${query}`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch performance workspace summary (${response.status})`);
  }
  return (await response.json()) as WorkbenchPerformanceWorkspaceSummary;
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
  const query = buildPerformanceWorkspaceQuery(params);
  const response = await fetch(
    `${BFF_PROXY_BASE}/workbench/${portfolioId}/performance/details?${query}`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch performance workspace details (${response.status})`);
  }
  return (await response.json()) as WorkbenchPerformanceWorkspaceDetails;
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

export async function getReportingSnapshot(
  portfolioId: string,
  asOfDate: string
): Promise<WorkbenchReportingSnapshot> {
  const query = new URLSearchParams();
  query.set("asOfDate", asOfDate);

  const response = await fetch(
    `${BFF_BASE_URL}/api/v1/reports/${portfolioId}/snapshot?${query.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch reporting snapshot (${response.status})`);
  }

  return (await response.json()) as WorkbenchReportingSnapshot;
}
