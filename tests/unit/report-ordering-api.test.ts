import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getReportOrderingOptions,
  listPortfolioReviewOrders,
  submitPortfolioReviewOrder,
} from "@/features/report-ordering/api";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "@/features/analytics-observability/metrics";
import {
  buildReportJobListResponse,
  buildReportOrderingResponse,
} from "../fixtures/report-ordering-fixtures";

describe("report ordering API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetAnalyticsUiMetricEvents();
  });

  it("loads selected-portfolio options through the Gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(buildReportOrderingResponse()), { status: 200 }),
      ),
    );

    await getReportOrderingOptions("PB_SG_GLOBAL_BAL_001");

    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/bff/api/v1/report-ordering/options?");
    expect(String(url)).toContain("scopeType=portfolio");
    expect(String(url)).toContain("scopeId=PB_SG_GLOBAL_BAL_001");
    expect(init?.headers).toBeInstanceOf(Headers);
    expect(JSON.stringify(getAnalyticsUiMetricEvents())).not.toContain(
      "PB_SG_GLOBAL_BAL_001",
    );
  });

  it("submits only the known JSON portfolio-review contract with a stable intent key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            report_request_id: "rrq_1",
            report_job_id: "rjob_1",
            status: "accepted",
            status_url: "/api/v1/report-jobs/rjob_1",
            idempotency_key: "intent_1",
          }),
          { status: 202 },
        ),
      ),
    );

    await submitPortfolioReviewOrder({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      asOfDate: "2026-04-22",
      outputFormat: "json",
      reportingCurrency: "SGD",
      benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
      allocationDimensions: ["asset_class", "currency"],
      sections: ["CLIENT_PROFILE", "OVERVIEW", "PERFORMANCE"],
      idempotencyKey: "intent_1",
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    const headers = init?.headers as Headers;
    const body = JSON.parse(String(init?.body));
    expect(String(url)).toBe("/api/bff/api/v1/reports/portfolio-reviews");
    expect(headers.get("Idempotency-Key")).toBe("intent_1");
    expect(headers.get("X-Role")).toBeNull();
    expect(headers.get("X-Caller-Portfolio-Ids")).toBeNull();
    expect(body).toEqual({
      portfolio_scope: { portfolio_ids: ["PB_SG_GLOBAL_BAL_001"] },
      as_of_date: "2026-04-22",
      requested_output_formats: ["json"],
      reporting_currency: "SGD",
      options: {
        sections: ["CLIENT_PROFILE", "OVERVIEW", "PERFORMANCE"],
        allocation_dimensions: ["asset_class", "currency"],
        benchmark_code: "BMK_PB_GLOBAL_BALANCED_60_40",
      },
    });
    expect(body.options).not.toHaveProperty("source_surface");
  });

  it("loads bounded portfolio history without exposing identifiers in metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(buildReportJobListResponse()), { status: 200 }),
      ),
    );

    const response = await listPortfolioReviewOrders("PB_SG_GLOBAL_BAL_001", 8);

    expect(response.items).toHaveLength(1);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/api/bff/api/v1/report-jobs?");
    expect(String(url)).toContain("portfolioId=PB_SG_GLOBAL_BAL_001");
    expect(String(url)).toContain("reportType=portfolio_review");
    expect(String(url)).toContain("limit=8");
    const metrics = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metrics).toContain("reporting.portfolio-review.history");
    expect(metrics).not.toContain("PB_SG_GLOBAL_BAL_001");
    expect(metrics).not.toContain("rjob_1");
  });
});
