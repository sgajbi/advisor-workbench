import { afterEach, describe, expect, it, vi } from "vitest";

import { getPortfolioTransactionRecord } from "../../src/apps/portfolio/api";
import { parsePortfolioTransactionRecord } from "../../src/apps/portfolio/portfolio-transaction-record";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";

describe("exact portfolio transaction record", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetAnalyticsUiMetricEvents();
  });

  it("requests and accepts only the addressed source record", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(buildRecord("TX_250")));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPortfolioTransactionRecord(
      "PB_SG_GLOBAL_BAL_001",
      "TX_250",
      { asOfDate: "2026-08-21", reportingCurrency: "SGD" },
    );

    expect(result.transaction.transaction_id).toBe("TX_250");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls as unknown[][])[0]?.[0])).toContain(
      "/api/v1/portfolio/portfolios/PB_SG_GLOBAL_BAL_001/transactions/TX_250?as_of_date=2026-08-21&include_projected=false&reporting_currency=SGD",
    );
  });

  it("rejects valid-shaped evidence for another portfolio or transaction", () => {
    for (const payload of [
      { ...buildRecord("TX_250"), portfolio_id: "PB_OTHER" },
      buildRecord("TX_OTHER"),
    ]) {
      expect(() =>
        parsePortfolioTransactionRecord(payload, {
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          transactionId: "TX_250",
        }),
      ).toThrowError(expect.objectContaining({ failure: "identity_mismatch" }));
    }
  });

  it("rejects malformed evidence without coercing a transaction", () => {
    expect(() =>
      parsePortfolioTransactionRecord(
        { ...buildRecord("TX_250"), correlation_id: "" },
        { portfolioId: "PB_SG_GLOBAL_BAL_001", transactionId: "TX_250" },
      ),
    ).toThrowError(
      expect.objectContaining({ failure: "source_contract_invalid" }),
    );
  });

  it("preserves Gateway failure classification", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              detail: {
                code: "portfolio_transaction_record_identity_mismatch",
              },
            }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    await expect(
      getPortfolioTransactionRecord("PB_SG_GLOBAL_BAL_001", "TX_250", {
        asOfDate: "2026-08-21",
        reportingCurrency: "SGD",
      }),
    ).rejects.toEqual(
      expect.objectContaining({ failure: "identity_mismatch" }),
    );
  });

  it.each([
    ["an empty body", ""],
    ["malformed JSON", "{"],
  ])(
    "classifies %s on a successful response as an invalid source contract",
    async (_case, body) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(body, {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
        ),
      );

      await expect(
        getPortfolioTransactionRecord("PB_SG_GLOBAL_BAL_001", "TX_250", {
          asOfDate: "2026-08-21",
          reportingCurrency: "SGD",
        }),
      ).rejects.toEqual(
        expect.objectContaining({ failure: "source_contract_invalid" }),
      );
    },
  );

  it("preserves cancellation while the exact response body is being decoded", async () => {
    const controller = new AbortController();
    const cancellation = new DOMException("Exact record request cancelled", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => {
          controller.abort(cancellation);
          throw cancellation;
        },
      })),
    );

    await expect(
      getPortfolioTransactionRecord("PB_SG_GLOBAL_BAL_001", "TX_250", {
        asOfDate: "2026-08-21",
        reportingCurrency: "SGD",
        signal: controller.signal,
      }),
    ).rejects.toBe(cancellation);
    expect(getAnalyticsUiMetricEvents()).toEqual([]);
  });

  it("preserves cancellation while the exact error body is being decoded", async () => {
    const controller = new AbortController();
    const cancellation = new DOMException("Exact record request cancelled", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 502,
        json: async () => {
          controller.abort(cancellation);
          throw cancellation;
        },
      })),
    );

    await expect(
      getPortfolioTransactionRecord("PB_SG_GLOBAL_BAL_001", "TX_250", {
        asOfDate: "2026-08-21",
        reportingCurrency: "SGD",
        signal: controller.signal,
      }),
    ).rejects.toBe(cancellation);
    expect(getAnalyticsUiMetricEvents()).toEqual([]);
  });
});

function buildRecord(transactionId: string) {
  return {
    correlation_id: "corr-exact-transaction",
    contract_version: "v1",
    portfolio_id: "PB_SG_GLOBAL_BAL_001",
    reporting_currency: "SGD",
    transaction: {
      transaction_id: transactionId,
      transaction_date: "2026-08-20T10:00:00Z",
      settlement_date: null,
      transaction_type: "BUY",
      security_id: "EQ_1",
      instrument_id: "INST_EQ_1",
      quantity: 10,
    },
    reason_codes: ["TRANSACTION_LEDGER_READY"],
  };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
