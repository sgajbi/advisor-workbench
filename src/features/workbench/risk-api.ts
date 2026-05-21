import { buildAnalyticsUiCorrelationHeaders } from "@/features/analytics-observability/correlation";
import {
  buildWorkbenchUrl,
  fetchWorkbenchJson,
  observeWorkbenchResource,
  type WorkbenchRequestTarget,
} from "@/features/workbench/api-client";
import type {
  WorkbenchRiskAttributionResponse,
  WorkbenchRiskConcentrationResponse,
  WorkbenchRiskDrawdownResponse,
  WorkbenchRiskRollingResponse,
  WorkbenchRiskSummaryResponse,
} from "@/features/workbench/types";

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
