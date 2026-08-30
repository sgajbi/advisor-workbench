import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPortfolio360,
  getReportingSnapshot,
  getWorkbenchAnalytics,
  getWorkbenchOverview,
} from "../../src/features/workbench/workbench-core-api";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";

describe("workbench core api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetAnalyticsUiMetricEvents();
  });

  it("keeps core portfolio reads on Gateway-backed workbench routes without leaking identifiers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const payload = url.includes("/overview")
          ? {
              correlation_id: "corr",
              portfolio_id: "PF_1001",
              as_of_date: "2026-02-24",
              summary: {},
              alerts: [],
              tasks: [],
              warnings: [],
              partial_failures: [],
            }
          : {
              correlation_id: "corr",
              portfolio_id: "PF_1001",
              as_of_date: "2026-02-24",
              portfolio: { portfolio_id: "PF_1001" },
              positions: [],
              warnings: [],
              partial_failures: [],
            };
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })
    );

    await getWorkbenchOverview("PF_1001");
    await getPortfolio360("PF_1001", "sess_1");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      "/api/v1/workbench/PF_1001/overview"
    );
    expect(fetchMock.mock.calls[1][0].toString()).toContain(
      "/api/v1/workbench/PF_1001/portfolio-360?session_id=sess_1"
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("advisor-overview");
    expect(metricEventsJson).toContain("portfolio-360");
    expect(metricEventsJson).not.toContain("PF_1001");
    expect(metricEventsJson).not.toContain("sess_1");
  });

  it("keeps legacy analytics and reporting snapshot reads parameterized through Gateway", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const payload = url.includes("/analytics")
          ? {
              correlation_id: "corr",
              contract_version: "v1",
              portfolio_id: "PF_1001",
              session_id: "sess_1",
              period: "YTD",
              group_by: "ASSET_CLASS",
              benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
              portfolio_return_pct: 2.1,
              benchmark_return_pct: 1.6,
              active_return_pct: 0.5,
              allocation_buckets: [],
              top_changes: [],
              warnings: [],
              partial_failures: [],
            }
          : {
              correlationId: "corr",
              contractVersion: "v1",
              sourceService: "lotus-report",
              portfolioId: "PF_1001",
              asOfDate: "2026-02-24",
              generatedAt: "2026-02-24T07:00:00Z",
              rows: [],
            };
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })
    );

    await getWorkbenchAnalytics("PF_1001", {
      period: "YTD",
      groupBy: "ASSET_CLASS",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      sessionId: "sess_1",
    });
    await getReportingSnapshot("PF_1001", "2026-02-24");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      "/api/v1/workbench/PF_1001/analytics?period=YTD&group_by=ASSET_CLASS&benchmark_code=BMK_GLOBAL_BALANCED_60_40&session_id=sess_1"
    );
    expect(fetchMock.mock.calls[1][0].toString()).toContain(
      "/api/v1/reports/PF_1001/snapshot?asOfDate=2026-02-24"
    );
    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("portfolio-analytics");
    expect(metricEventsJson).toContain("reporting-snapshot");
    expect(metricEventsJson).not.toContain("PF_1001");
    expect(metricEventsJson).not.toContain("sess_1");
  });
});
