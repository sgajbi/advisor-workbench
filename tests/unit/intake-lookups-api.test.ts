import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrencyLookups, getInstrumentLookups, getPortfolioLookups } from "../../src/features/intake/lookups-api";

describe("intake lookups api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls lookup endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr_1",
            contract_version: "v1",
            items: [{ id: "USD", label: "USD" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getPortfolioLookups();
    await getInstrumentLookups();
    await getCurrencyLookups();

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const urls = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(urls).toContain("/api/bff/api/v1/lookups/portfolios");
    expect(urls).toContain("/api/bff/api/v1/lookups/instruments?limit=200");
    expect(urls).toContain("/api/bff/api/v1/lookups/currencies");
  });
});
