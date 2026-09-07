import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPortfolioReviewBatchStatus,
  getReportOrderingOptions,
  listPortfolioReviewOrders,
  submitPortfolioReviewBatch,
  submitPortfolioReviewOrder,
} from "@/features/report-ordering/api";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "@/features/analytics-observability/metrics";
import {
  buildReportBatchHandle,
  buildReportBatchStatus,
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
      vi.fn(
        async () =>
          new Response(JSON.stringify(buildReportOrderingResponse()), {
            status: 200,
          }),
      ),
    );

    await getReportOrderingOptions("PB_SG_GLOBAL_BAL_001", {
      asOfDate: "2026-04-22",
      reportingCurrency: "SGD",
    });

    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/bff/api/v1/report-ordering/options?");
    expect(String(url)).toContain("scopeType=portfolio");
    expect(String(url)).toContain("scopeId=PB_SG_GLOBAL_BAL_001");
    expect(String(url)).toContain("asOfDate=2026-04-22");
    expect(String(url)).toContain("reportingCurrency=SGD");
    expect(init?.headers).toBeInstanceOf(Headers);
    expect(JSON.stringify(getAnalyticsUiMetricEvents())).not.toContain(
      "PB_SG_GLOBAL_BAL_001",
    );
  });

  it.each(["json", "pdf"] as const)(
    "submits a source-supported %s portfolio-review output with a stable intent key",
    async (outputFormat) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
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
        outputFormat,
        reportingCurrency: "SGD",
        allocationDimensions: ["asset_class", "currency"],
        configurationValues: { advisor_brief_run_id: "abr_accepted_1" },
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
        requested_output_formats: [outputFormat],
        reporting_currency: "SGD",
        options: {
          sections: ["CLIENT_PROFILE", "OVERVIEW", "PERFORMANCE"],
          allocation_dimensions: ["asset_class", "currency"],
          advisor_brief_run_id: "abr_accepted_1",
        },
      });
      expect(body.options).not.toHaveProperty("source_surface");
    },
  );

  it("omits optional configuration that the report family does not publish", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
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
      allocationDimensions: [],
      sections: ["CLIENT_PROFILE", "OVERVIEW"],
      idempotencyKey: "intent_1",
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      portfolio_scope: { portfolio_ids: ["PB_SG_GLOBAL_BAL_001"] },
      as_of_date: "2026-04-22",
      requested_output_formats: ["json"],
      options: { sections: ["CLIENT_PROFILE", "OVERVIEW"] },
    });
  });

  it("loads bounded portfolio history without exposing identifiers in metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(buildReportJobListResponse()), {
            status: 200,
          }),
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

  it("submits an explicit portfolio selection without browser-authored candidate authority", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(buildReportBatchHandle()), {
            status: 202,
          }),
      ),
    );

    await submitPortfolioReviewBatch({
      portfolioIds: ["PB_SG_GLOBAL_BAL_001", "PB_SG_INCOME_002"],
      asOfDate: "2026-04-22",
      outputFormat: "pdf",
      reportingCurrency: "SGD",
      allocationDimensions: [],
      sections: ["CLIENT_PROFILE", "OVERVIEW"],
      idempotencyKey: "batch_intent_1",
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(String(url)).toBe("/api/bff/api/v1/report-batches");
    expect((init?.headers as Headers).get("Idempotency-Key")).toBe(
      "batch_intent_1",
    );
    expect(body).toEqual({
      selector_mode: "explicit_portfolio_list",
      portfolio_ids: ["PB_SG_GLOBAL_BAL_001", "PB_SG_INCOME_002"],
      as_of_date: "2026-04-22",
      requested_output_formats: ["pdf"],
      reporting_currency: "SGD",
      options: { sections: ["CLIENT_PROFILE", "OVERVIEW"] },
    });
    expect(body).not.toHaveProperty("source_candidates");
  });

  it("loads source-owned portfolio outcomes for a known report batch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(buildReportBatchStatus()), {
            status: 200,
          }),
      ),
    );

    const response = await getPortfolioReviewBatchStatus("rbch_1");

    expect(response.status).toBe("completed_with_failures");
    expect(response.items).toHaveLength(2);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe(
      "/api/bff/api/v1/report-batches/rbch_1",
    );
  });
});
