import { describe, expect, it } from "vitest";

import type { PortfolioPositionView } from "../../src/apps/portfolio/types";
import { buildProposalPortfolioEvidence } from "../../src/features/proposals/proposal-portfolio-evidence";

const positions: PortfolioPositionView[] = [
  {
    security_id: "AAPL",
    instrument_name: "Apple Inc.",
    asset_class: "Equities",
    quantity: 100,
    market_value_base: 19_000,
    weight_pct: 82.6,
  },
  {
    security_id: "CASH_USD",
    instrument_name: "US Dollar Cash",
    asset_class: "Cash",
    quantity: 1,
    market_value_base: 4_000,
    weight_pct: 17.4,
  },
];

function portfolioBook(overrides: Record<string, unknown> = {}) {
  return {
    as_of_date: "2026-04-10",
    portfolio: {
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      display_name: "Global Balanced Portfolio",
      client_id: "CIF_001",
      base_currency: "USD",
      booking_center_code: "SGPB",
    },
    summary: {
      assets_under_management_base: 44_000,
      invested_market_value_base: 19_000,
      cash_market_value_base: 25_000,
      cash_weight_pct: 56.8,
      position_count: positions.length,
      cash_balance_count: 1,
    },
    positions,
    ...overrides,
  };
}

function readyQuery<T>(data: T) {
  return {
    data,
    isLoading: false,
    isFetching: false,
    error: null,
  };
}

function failedQuery<T = never>() {
  return {
    data: undefined as T | undefined,
    isLoading: false,
    isFetching: false,
    error: new Error("gateway unavailable"),
  };
}

type BuildEvidenceInput = Parameters<typeof buildProposalPortfolioEvidence>[0];

function buildEvidence(overrides: Partial<BuildEvidenceInput> = {}) {
  const input: BuildEvidenceInput = {
    portfolioId: "PB_SG_GLOBAL_BAL_001",
    asOfDate: "2026-04-10",
    reportingCurrency: "USD",
    bookQuery: readyQuery(portfolioBook()),
    manualCashAmount: 10_000,
    ...overrides,
  };
  return buildProposalPortfolioEvidence(input);
}

describe("proposal portfolio evidence", () => {
  it("admits evaluation only from one complete book matching the selected context", () => {
    const evidence = buildEvidence();

    expect(evidence).toMatchObject({
      status: "ready",
      canEvaluateAndHandoff: true,
      title: "Portfolio evidence confirmed",
      body: "Positions and cash match the selected portfolio, advisory date, and currency.",
      context: {
        requestedAsOfDate: "2026-04-10",
        effectiveAsOfDate: "2026-04-10",
        requestedCurrency: "USD",
        effectiveCurrency: "USD",
      },
      positions: {
        status: "ready",
        items: [expect.objectContaining({ security_id: "AAPL" })],
      },
      cash: {
        amount: 25_000,
        authority: "portfolio_book",
        label: "Portfolio book cash confirmed",
      },
    });
  });

  it("admits a valid leap-day portfolio context", () => {
    const evidence = buildEvidence({
      asOfDate: "2028-02-29",
      bookQuery: readyQuery(portfolioBook({ as_of_date: "2028-02-29" })),
    });

    expect(evidence).toMatchObject({
      status: "ready",
      canEvaluateAndHandoff: true,
      context: {
        requestedAsOfDate: "2028-02-29",
        effectiveAsOfDate: "2028-02-29",
        dateIssue: null,
      },
    });
  });

  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10"])(
    "fails closed on invalid carried calendar date %s",
    (asOfDate) => {
      const evidence = buildEvidence({ asOfDate });

      expect(evidence).toMatchObject({
        status: "unavailable",
        canEvaluateAndHandoff: false,
        title: "Advisory date needs correction",
        body: "The advisory date carried into this proposal is not a valid calendar date.",
        context: {
          requestedAsOfDate: asOfDate,
          dateIssue: "invalid_requested_date",
        },
        positions: { status: "unavailable" },
      });
    },
  );

  it.each(["2026-02-29", "2026-04-31", "2026-13-01"])(
    "fails closed on invalid source calendar date %s",
    (asOfDate) => {
      const evidence = buildEvidence({
        bookQuery: readyQuery(portfolioBook({ as_of_date: asOfDate })),
      });

      expect(evidence).toMatchObject({
        status: "unavailable",
        canEvaluateAndHandoff: false,
        title: "Portfolio evidence date is unavailable",
        body: "The portfolio source returned an advisory date that is not a valid calendar date.",
        context: {
          effectiveAsOfDate: asOfDate,
          dateIssue: "invalid_source_date",
        },
        positions: { status: "unavailable" },
      });
    },
  );

  it("distinguishes a confirmed empty book from unavailable evidence", () => {
    const evidence = buildEvidence({
      bookQuery: readyQuery(portfolioBook({ positions: [] })),
    });

    expect(evidence.status).toBe("ready");
    expect(evidence.canEvaluateAndHandoff).toBe(true);
    expect(evidence.positions).toEqual({ status: "empty", items: [] });
  });

  it.each([
    ["date", { as_of_date: "2026-04-09" }],
    [
      "portfolio",
      {
        portfolio: {
          ...portfolioBook().portfolio,
          portfolio_id: "PB_OTHER_001",
        },
      },
    ],
    [
      "currency",
      {
        portfolio: {
          ...portfolioBook().portfolio,
          base_currency: "SGD",
        },
      },
    ],
  ])("fails closed when source %s does not match the selected context", (_name, mismatch) => {
    const evidence = buildEvidence({
      bookQuery: readyQuery(portfolioBook(mismatch)),
    });

    expect(evidence).toMatchObject({
      status: "context_mismatch",
      canEvaluateAndHandoff: false,
      title: "Portfolio context does not match",
      positions: {
        status: "context_mismatch",
      },
    });
  });

  it.each([
    ["date", { as_of_date: undefined }],
    ["portfolio", { portfolio: undefined }],
    [
      "currency",
      {
        portfolio: {
          ...portfolioBook().portfolio,
          base_currency: "US",
        },
      },
    ],
    ["cash", { summary: { cash_market_value_base: undefined } }],
    ["positions", { positions: undefined }],
  ])("treats a response with missing %s evidence as incomplete", (_name, malformed) => {
    const evidence = buildEvidence({
      bookQuery: readyQuery(portfolioBook(malformed)),
    });

    expect(evidence.canEvaluateAndHandoff).toBe(false);
    expect(["partial", "unavailable"]).toContain(evidence.status);
  });

  it("keeps visible positions non-authoritative when combined evidence is incomplete", () => {
    const evidence = buildEvidence({
      bookQuery: readyQuery(
        portfolioBook({ summary: { cash_market_value_base: undefined } })
      ),
    });

    expect(evidence).toMatchObject({
      status: "partial",
      canEvaluateAndHandoff: false,
      body: "Available positions or cash remain visible, but the combined portfolio snapshot is incomplete.",
      positions: {
        status: "partial",
        items: [expect.objectContaining({ security_id: "AAPL" })],
      },
    });
  });

  it("exposes recovery and failure posture for incomplete cached evidence", () => {
    const incompleteBook = portfolioBook({
      summary: { cash_market_value_base: undefined },
    });
    const refreshing = buildEvidence({
      bookQuery: { ...readyQuery(incompleteBook), isFetching: true },
    });
    const failed = buildEvidence({
      bookQuery: {
        ...readyQuery(incompleteBook),
        error: new Error("incomplete book refresh failed"),
      },
    });

    expect(refreshing).toMatchObject({
      status: "refreshing",
      canEvaluateAndHandoff: false,
      positions: { status: "refreshing" },
    });
    expect(failed).toMatchObject({
      status: "refresh_failed",
      canEvaluateAndHandoff: false,
      positions: { status: "cached" },
    });
  });

  it("does not convert a failed source read into an empty book or confirmed manual cash", () => {
    const evidence = buildEvidence({
      bookQuery: failedQuery(),
    });

    expect(evidence).toMatchObject({
      status: "unavailable",
      canEvaluateAndHandoff: false,
      title: "Portfolio evidence is unavailable",
      positions: { status: "unavailable", items: [] },
      cash: {
        amount: 10_000,
        authority: "manual_scenario",
        label: "Additional cash assumption",
      },
    });
  });

  it("reports source bootstrap failure before omitted controls are confirmed", () => {
    const evidence = buildEvidence({
      asOfDate: "",
      reportingCurrency: "",
      bookQuery: failedQuery(),
    });

    expect(evidence).toMatchObject({
      status: "unavailable",
      canEvaluateAndHandoff: false,
      positions: { status: "unavailable", items: [] },
    });
  });

  it("does not publish a zero manual assumption when the entered value is invalid", () => {
    const evidence = buildEvidence({
      bookQuery: failedQuery(),
      manualCashAmount: null,
    });

    expect(evidence.cash).toEqual({
      amount: null,
      authority: "manual_scenario",
      label: "Additional cash assumption needs correction",
    });
  });

  it("preserves cached evidence but fails closed after a refresh error", () => {
    const evidence = buildEvidence({
      bookQuery: {
        ...readyQuery(portfolioBook()),
        error: new Error("book refresh failed"),
      },
    });

    expect(evidence).toMatchObject({
      status: "refresh_failed",
      canEvaluateAndHandoff: false,
      positions: {
        status: "cached",
        items: [expect.objectContaining({ security_id: "AAPL" })],
      },
      cash: { amount: 25_000, authority: "portfolio_book" },
    });
  });

  it("pauses evaluation while cached evidence refreshes", () => {
    const evidence = buildEvidence({
      bookQuery: { ...readyQuery(portfolioBook()), isFetching: true },
    });

    expect(evidence.status).toBe("refreshing");
    expect(evidence.canEvaluateAndHandoff).toBe(false);
    expect(evidence.positions.status).toBe("refreshing");
  });

  it("exposes active recovery posture while mismatched evidence refreshes", () => {
    const mismatchedBook = portfolioBook({ as_of_date: "2026-04-09" });
    const refreshing = buildEvidence({
      bookQuery: { ...readyQuery(mismatchedBook), isFetching: true },
    });
    const failed = buildEvidence({
      bookQuery: {
        ...readyQuery(mismatchedBook),
        error: new Error("mismatched book refresh failed"),
      },
    });

    expect(refreshing).toMatchObject({
      status: "refreshing",
      canEvaluateAndHandoff: false,
      positions: { status: "context_mismatch" },
    });
    expect(failed).toMatchObject({
      status: "refresh_failed",
      canEvaluateAndHandoff: false,
      positions: { status: "context_mismatch" },
    });
  });

  it("does not classify an incomplete context as ready or start with fabricated evidence", () => {
    const evidence = buildEvidence({
      asOfDate: "",
      bookQuery: {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: null,
      },
    });

    expect(evidence.status).toBe("not_selected");
    expect(evidence.canEvaluateAndHandoff).toBe(false);
  });
});
