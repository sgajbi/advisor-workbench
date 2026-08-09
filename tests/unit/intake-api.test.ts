import { afterEach, describe, expect, it, vi } from "vitest";

import { ingestPortfolioBundle } from "../../src/features/intake/api";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";

describe("intake api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetAnalyticsUiMetricEvents();
  });

  it("calls intake portfolio-bundle endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr_1",
            contract_version: "v1",
            data: { message: "ok", published_counts: { portfolios: 1 } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await ingestPortfolioBundle({
      sourceSystem: "ADVISOR_WORKBENCH_UI",
      mode: "UPSERT",
      businessDates: [{ businessDate: "2026-01-02" }],
      portfolios: [],
      instruments: [],
      transactions: [],
      marketPrices: [],
      fxRates: [],
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/api/v1/intake/portfolio-bundle",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
      })
    );

    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("portfolio-intake-bundle");
    expect(metricEventsJson).toContain("intake.portfolio-bundle.ingest");
    expect(metricEventsJson).toContain('"supportability_state":"unknown"');
    expect(metricEventsJson).not.toContain("corr_1");
    expect(metricEventsJson).not.toContain("ADVISOR_WORKBENCH_UI");
    expect(metricEventsJson).not.toContain("2026-01-02");
  });

  it("forwards optional intake bundle idempotency keys to gateway", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr_1",
            contract_version: "v1",
            data: { message: "ok", published_counts: { portfolios: 1 } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await ingestPortfolioBundle(
      {
        sourceSystem: "ADVISOR_WORKBENCH_UI",
        mode: "UPSERT",
        businessDates: [{ businessDate: "2026-01-02" }],
        portfolios: [],
        instruments: [],
        transactions: [],
        marketPrices: [],
        fxRates: [],
      },
      { idempotencyKey: " intake-submit-1 " }
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/api/v1/intake/portfolio-bundle",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": "intake-submit-1",
        },
      })
    );
  });

  it("records bounded failure posture without leaking intake response bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("portfolio PF_PRIVATE failed", { status: 422 }))
    );

    await expect(
      ingestPortfolioBundle({
        sourceSystem: "ADVISOR_WORKBENCH_UI",
        mode: "UPSERT",
        businessDates: [{ businessDate: "2026-01-02" }],
        portfolios: [],
        instruments: [],
        transactions: [],
        marketPrices: [],
        fxRates: [],
      })
    ).rejects.toThrow("Portfolio intake returned an unreadable response (422)");

    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("portfolio-intake-bundle");
    expect(metricEventsJson).toContain('"status_class":"4xx"');
    expect(metricEventsJson).not.toContain("PF_PRIVATE");
    expect(metricEventsJson).not.toContain("portfolio PF_PRIVATE failed");
  });

  it("rejects successful HTTP responses without source confirmation evidence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr_missing_counts",
            contract_version: "v1",
            data: { message: "accepted" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      ingestPortfolioBundle({
        sourceSystem: "ADVISOR_WORKBENCH_UI",
        mode: "UPSERT",
        businessDates: [],
        portfolios: [],
        instruments: [],
        transactions: [],
        marketPrices: [],
        fxRates: [],
      }),
    ).rejects.toThrow("incomplete confirmation evidence");
  });

  it("rejects hostile or invalid published counts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr_invalid_counts",
            contract_version: "v1",
            data: { published_counts: { portfolios: -1, transactions: "many" } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      ingestPortfolioBundle({
        sourceSystem: "ADVISOR_WORKBENCH_UI",
        mode: "UPSERT",
        businessDates: [],
        portfolios: [],
        instruments: [],
        transactions: [],
        marketPrices: [],
        fxRates: [],
      }),
    ).rejects.toThrow("incomplete confirmation evidence");
  });
});
