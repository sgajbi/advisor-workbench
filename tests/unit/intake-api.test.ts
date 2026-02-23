import { afterEach, describe, expect, it, vi } from "vitest";

import { ingestPortfolioBundle } from "../../src/features/intake/api";

describe("intake api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(fetchMock).toHaveBeenCalledWith("/api/bff/api/v1/intake/portfolio-bundle", expect.any(Object));
  });
});
