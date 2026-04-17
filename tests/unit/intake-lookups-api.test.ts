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

  it("preserves instrument and currency lookup filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr_2",
            contract_version: "v1",
            items: [{ id: "USD", label: "USD" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getInstrumentLookups({ limit: 50, productType: "EQUITY", q: "Apple" });
    await getCurrencyLookups({
      instrumentPageLimit: 500,
      source: "INSTRUMENTS",
      q: "USD",
      limit: 10,
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const urls = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(urls).toContain(
      "/api/bff/api/v1/lookups/instruments?limit=50&product_type=EQUITY&q=Apple"
    );
    expect(urls).toContain(
      "/api/bff/api/v1/lookups/currencies?instrument_page_limit=500&source=INSTRUMENTS&q=USD&limit=10"
    );
  });
});
