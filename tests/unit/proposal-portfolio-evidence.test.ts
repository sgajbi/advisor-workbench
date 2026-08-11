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
    bookQuery: readyQuery({ positions }),
    workspaceQuery: readyQuery({ summary: { total_cash_base: 25_000 } }),
    manualCashAmount: 10_000,
    ...overrides,
  };
  return buildProposalPortfolioEvidence(input);
}

describe("proposal portfolio evidence", () => {
  it("admits evaluation only after the book and workspace cash are both usable", () => {
    const evidence = buildEvidence();

    expect(evidence).toMatchObject({
      status: "ready",
      canEvaluate: true,
      title: "Portfolio evidence confirmed",
      positions: {
        status: "ready",
        items: [expect.objectContaining({ security_id: "AAPL" })],
      },
      cash: {
        amount: 25_000,
        authority: "workspace",
        label: "Portfolio cash confirmed",
      },
    });
  });

  it("distinguishes a confirmed empty book from unavailable evidence", () => {
    const evidence = buildEvidence({
      bookQuery: readyQuery({ positions: [] }),
    });

    expect(evidence.status).toBe("ready");
    expect(evidence.canEvaluate).toBe(true);
    expect(evidence.positions).toEqual({ status: "empty", items: [] });
  });

  it("keeps partial book evidence visible without authorizing evaluation", () => {
    const evidence = buildEvidence({
      workspaceQuery: failedQuery<{ summary: { total_cash_base: number } }>(),
    });

    expect(evidence).toMatchObject({
      status: "partial",
      canEvaluate: false,
      title: "Portfolio evidence is incomplete",
      positions: {
        status: "ready",
        items: [expect.objectContaining({ security_id: "AAPL" })],
      },
      cash: {
        amount: 4_000,
        authority: "portfolio_book",
      },
    });
  });

  it("does not convert failed source reads into an empty book or confirmed manual cash", () => {
    const evidence = buildEvidence({
      bookQuery: failedQuery<{ positions: typeof positions }>(),
      workspaceQuery: failedQuery<{ summary: { total_cash_base: number } }>(),
    });

    expect(evidence).toMatchObject({
      status: "unavailable",
      canEvaluate: false,
      title: "Portfolio evidence is unavailable",
      positions: { status: "unavailable", items: [] },
      cash: {
        amount: 10_000,
        authority: "manual_scenario",
        label: "Manual scenario cash",
      },
    });
  });

  it("preserves cached evidence but fails closed after a refresh error", () => {
    const evidence = buildEvidence({
      bookQuery: {
        ...readyQuery({ positions }),
        error: new Error("book refresh failed"),
      },
      workspaceQuery: {
        ...readyQuery({ summary: { total_cash_base: 25_000 } }),
        error: new Error("workspace refresh failed"),
      },
    });

    expect(evidence).toMatchObject({
      status: "refresh_failed",
      canEvaluate: false,
      positions: {
        status: "cached",
        items: [expect.objectContaining({ security_id: "AAPL" })],
      },
      cash: { amount: 25_000, authority: "workspace" },
    });
  });

  it("pauses evaluation while cached evidence refreshes", () => {
    const evidence = buildEvidence({
      bookQuery: { ...readyQuery({ positions }), isFetching: true },
      workspaceQuery: {
        ...readyQuery({ summary: { total_cash_base: 25_000 } }),
        isFetching: true,
      },
    });

    expect(evidence.status).toBe("refreshing");
    expect(evidence.canEvaluate).toBe(false);
    expect(evidence.positions.status).toBe("refreshing");
  });

  it("treats malformed 2xx evidence as unavailable", () => {
    const evidence = buildEvidence({
      bookQuery: readyQuery({}),
      workspaceQuery: readyQuery({ summary: {} }),
    });

    expect(evidence.status).toBe("unavailable");
    expect(evidence.canEvaluate).toBe(false);
    expect(evidence.positions.status).toBe("unavailable");
  });

  it("does not classify a disabled query as ready before a portfolio is selected", () => {
    const evidence = buildEvidence({
      portfolioId: "  ",
      bookQuery: {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: null,
      },
      workspaceQuery: {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: null,
      },
    });

    expect(evidence.status).toBe("not_selected");
    expect(evidence.canEvaluate).toBe(false);
  });
});
