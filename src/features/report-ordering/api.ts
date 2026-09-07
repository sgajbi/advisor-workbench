import { buildAnalyticsUiCorrelationHeaders } from "@/features/analytics-observability/correlation";
import {
  buildWorkbenchUrl,
  fetchWorkbenchJson,
  fetchWorkbenchMutation,
  observeWorkbenchMutation,
  observeWorkbenchResource,
} from "@/features/workbench/api-client";

import {
  parseReportBatchHandle,
  parseReportBatchStatus,
  parseReportJobHandle,
  parseReportJobListResponse,
  parseReportOrderingResponse,
  type ReportBatchHandle,
  type ReportBatchStatus,
  type ReportJobHandle,
  type ReportJobListResponse,
  type ReportOrderingResponse,
} from "./contracts";

export type PortfolioReviewOrder = {
  portfolioId: string;
  asOfDate: string;
  outputFormat: "json" | "pdf";
  reportingCurrency?: string;
  allocationDimensions?: string[];
  configurationValues?: Record<string, string>;
  sections: string[];
  idempotencyKey: string;
};

export type PortfolioReviewBatchOrder = Omit<
  PortfolioReviewOrder,
  "portfolioId"
> & {
  portfolioIds: string[];
};

export async function getReportOrderingOptions(
  portfolioId: string,
  availabilityContext?: Readonly<{
    asOfDate: string;
    reportingCurrency: string;
  }>,
): Promise<ReportOrderingResponse> {
  const query = new URLSearchParams({
    scopeType: "portfolio",
    scopeId: portfolioId,
  });
  if (availabilityContext?.asOfDate) {
    query.set("asOfDate", availabilityContext.asOfDate);
  }
  if (availabilityContext?.reportingCurrency) {
    query.set("reportingCurrency", availabilityContext.reportingCurrency);
  }

  return await observeWorkbenchResource(
    "reporting.ordering.options",
    async () => {
      const payload = await fetchWorkbenchJson<unknown>(
        buildWorkbenchUrl("client", "/report-ordering/options", query),
        "report ordering options",
        { headers: buildAnalyticsUiCorrelationHeaders() },
      );
      return parseReportOrderingResponse(payload);
    },
  );
}

export async function submitPortfolioReviewOrder(
  order: PortfolioReviewOrder,
): Promise<ReportJobHandle> {
  return await observeWorkbenchMutation(
    "reporting.portfolio-review.submit",
    async () => {
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
            ...buildReportConfigurationPayload(order),
          }),
        },
      );
      return parseReportJobHandle(payload);
    },
  );
}

export async function submitPortfolioReviewBatch(
  order: PortfolioReviewBatchOrder,
): Promise<ReportBatchHandle> {
  return await observeWorkbenchMutation(
    "reporting.portfolio-review.batch.submit",
    async () => {
      const payload = await fetchWorkbenchMutation<unknown>(
        buildWorkbenchUrl("client", "/report-batches"),
        "portfolio report batch",
        {
          method: "POST",
          headers: buildAnalyticsUiCorrelationHeaders({
            "Idempotency-Key": order.idempotencyKey,
          }),
          body: JSON.stringify({
            selector_mode: "explicit_portfolio_list",
            portfolio_ids: order.portfolioIds,
            ...buildReportConfigurationPayload(order),
          }),
        },
      );
      return parseReportBatchHandle(payload);
    },
  );
}

export async function getPortfolioReviewBatchStatus(
  batchId: string,
): Promise<ReportBatchStatus> {
  return await observeWorkbenchResource(
    "reporting.portfolio-review.batch.status",
    async () => {
      const payload = await fetchWorkbenchJson<unknown>(
        buildWorkbenchUrl(
          "client",
          `/report-batches/${encodeURIComponent(batchId)}`,
        ),
        "portfolio report batch status",
        { headers: buildAnalyticsUiCorrelationHeaders() },
      );
      return parseReportBatchStatus(payload);
    },
  );
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

  return await observeWorkbenchResource(
    "reporting.portfolio-review.history",
    async () => {
      const payload = await fetchWorkbenchJson<unknown>(
        buildWorkbenchUrl("client", "/report-jobs", query),
        "recent portfolio review requests",
        { headers: buildAnalyticsUiCorrelationHeaders() },
      );
      return parseReportJobListResponse(payload);
    },
  );
}

function buildReportConfigurationPayload(
  order: Omit<PortfolioReviewOrder, "portfolioId" | "idempotencyKey">,
) {
  return {
    as_of_date: order.asOfDate,
    requested_output_formats: [order.outputFormat],
    ...(order.reportingCurrency
      ? { reporting_currency: order.reportingCurrency }
      : {}),
    options: {
      sections: order.sections,
      ...(order.allocationDimensions?.length
        ? { allocation_dimensions: order.allocationDimensions }
        : {}),
      ...order.configurationValues,
    },
  };
}
