import { buildAnalyticsUiCorrelationHeaders } from "@/features/analytics-observability/correlation";
import {
  buildWorkbenchUrl,
  fetchWorkbenchJson,
  fetchWorkbenchMutation,
  observeWorkbenchMutation,
  observeWorkbenchResource,
} from "@/features/workbench/api-client";

import {
  parseReportJobHandle,
  parseReportJobListResponse,
  parseReportOrderingResponse,
  type ReportJobHandle,
  type ReportJobListResponse,
  type ReportOrderingResponse,
} from "./contracts";

export type PortfolioReviewOrder = {
  portfolioId: string;
  asOfDate: string;
  outputFormat: "json";
  reportingCurrency?: string;
  benchmarkCode?: string;
  allocationDimensions: string[];
  sections: string[];
  idempotencyKey: string;
};

export async function getReportOrderingOptions(
  portfolioId: string,
): Promise<ReportOrderingResponse> {
  const query = new URLSearchParams({
    scopeType: "portfolio",
    scopeId: portfolioId,
  });

  return await observeWorkbenchResource("reporting.ordering.options", async () => {
    const payload = await fetchWorkbenchJson<unknown>(
      buildWorkbenchUrl("client", "/report-ordering/options", query),
      "report ordering options",
      { headers: buildAnalyticsUiCorrelationHeaders() },
    );
    return parseReportOrderingResponse(payload);
  });
}

export async function submitPortfolioReviewOrder(
  order: PortfolioReviewOrder,
): Promise<ReportJobHandle> {
  return await observeWorkbenchMutation("reporting.portfolio-review.submit", async () => {
    const payload = await fetchWorkbenchMutation<unknown>(
      buildWorkbenchUrl("client", "/reports/portfolio-reviews"),
      "portfolio review request",
      {
        method: "POST",
        headers: buildAnalyticsUiCorrelationHeaders({
          "Idempotency-Key": order.idempotencyKey,
        }),
        body: JSON.stringify({
          portfolio_scope: { portfolio_ids: [order.portfolioId] },
          as_of_date: order.asOfDate,
          requested_output_formats: [order.outputFormat],
          reporting_currency: order.reportingCurrency || null,
          options: {
            sections: order.sections,
            allocation_dimensions: order.allocationDimensions,
            ...(order.benchmarkCode ? { benchmark_code: order.benchmarkCode } : {}),
          },
        }),
      },
    );
    return parseReportJobHandle(payload);
  });
}

export async function listPortfolioReviewOrders(
  portfolioId: string,
  limit = 10,
): Promise<ReportJobListResponse> {
  const query = new URLSearchParams({
    portfolioId,
    reportType: "portfolio_review",
    limit: String(limit),
  });

  return await observeWorkbenchResource("reporting.portfolio-review.history", async () => {
    const payload = await fetchWorkbenchJson<unknown>(
      buildWorkbenchUrl("client", "/report-jobs", query),
      "recent portfolio review requests",
      { headers: buildAnalyticsUiCorrelationHeaders() },
    );
    return parseReportJobListResponse(payload);
  });
}
