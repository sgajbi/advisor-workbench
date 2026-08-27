import { describe, expect, it } from "vitest";

import type { PortfolioPositionView } from "../../src/apps/portfolio/types";
import {
  buildProposalDraftCurrencyAuthority,
  buildProposalDraftImpactModel,
} from "../../src/features/proposals/proposal-draft-currency-authority";
import type {
  ProposalDraftCashFlowIntent,
  ProposalDraftTradeIntent,
} from "../../src/features/proposals/proposal-draft-preview";
import type { ProposalPortfolioEvidenceModel } from "../../src/features/proposals/proposal-portfolio-evidence";

const position: PortfolioPositionView = {
  security_id: "AAPL",
  instrument_name: "Apple Inc.",
  asset_class: "Equities",
  quantity: 100,
  market_price: 190,
  market_value_base: 19_000,
  weight_pct: 82.6,
};

function portfolioEvidence({
  sourceCurrency = "USD",
  positions = [position],
  cashAuthority = "portfolio_book",
}: {
  sourceCurrency?: string | null;
  positions?: PortfolioPositionView[];
  cashAuthority?: "portfolio_book" | "manual_scenario";
} = {}): ProposalPortfolioEvidenceModel {
  return {
    status: cashAuthority === "portfolio_book" ? "ready" : "unavailable",
    canEvaluateAndHandoff: cashAuthority === "portfolio_book",
    title: "Portfolio evidence",
    body: "Portfolio evidence posture",
    hint: null,
    context: {
      requestedAsOfDate: "2026-04-10",
      effectiveAsOfDate: sourceCurrency ? "2026-04-10" : null,
      dateIssue: null,
      requestedCurrency: "USD",
      effectiveCurrency: sourceCurrency,
    },
    positions: {
      status: positions.length > 0 ? "ready" : "unavailable",
      items: positions,
    },
    cash: {
      amount: cashAuthority === "portfolio_book" ? 25_000 : 10_000,
      authority: cashAuthority,
      label: cashAuthority === "portfolio_book" ? "Portfolio book cash" : "Manual scenario cash",
    },
  };
}

function cashFlow(currency: string, amount = 1_000): ProposalDraftCashFlowIntent {
  return {
    id: `cash-${currency}`,
    currency,
    amount,
    direction: "IN",
    description: "Scenario contribution",
  };
}

function pricedTrade(currency: string | null): ProposalDraftTradeIntent {
  return {
    id: "trade-VTI",
    source: "NEW_INSTRUMENT",
    side: "BUY",
    instrumentId: "VTI",
    quantity: 5,
    referencePrice: 250,
    referencePriceCurrency: currency,
  };
}

describe("proposal draft currency authority", () => {
  it("admits a source-backed preview only when source and active draft values share one currency", () => {
    expect(
      buildProposalDraftCurrencyAuthority({
        requestedCurrency: "usd",
        portfolioEvidence: portfolioEvidence(),
        cashFlows: [cashFlow("USD")],
        trades: [pricedTrade("USD")],
      })
    ).toMatchObject({
      status: "available",
      currency: "USD",
      requestedCurrency: "USD",
      sourceCurrency: "USD",
      conflictingCurrencies: [],
    });
  });

  it("withholds projection when source evidence uses a different currency", () => {
    expect(
      buildProposalDraftCurrencyAuthority({
        requestedCurrency: "USD",
        portfolioEvidence: portfolioEvidence({ sourceCurrency: "SGD" }),
        cashFlows: [],
        trades: [],
      })
    ).toMatchObject({
      status: "mixed_currency",
      currency: null,
      conflictingCurrencies: ["SGD"],
    });
  });

  it("never constructs a preview beside mixed-currency authority", () => {
    expect(
      buildProposalDraftImpactModel({
        positions: [position],
        cashAmount: 25_000,
        cashFlows: [cashFlow("USD")],
        trades: [],
        requestedCurrency: "USD",
        portfolioEvidence: portfolioEvidence({ sourceCurrency: "SGD" }),
      })
    ).toMatchObject({
      status: "unavailable",
      currencyAuthority: { status: "mixed_currency" },
      preview: null,
    });
  });

  it("withholds impact instead of coercing an invalid additional-cash assumption to zero", () => {
    expect(
      buildProposalDraftImpactModel({
        positions: [position],
        cashAmount: 25_000,
        cashFlows: [],
        trades: [],
        requestedCurrency: "USD",
        portfolioEvidence: portfolioEvidence(),
        additionalCashAdmission: {
          status: "invalid",
          reason: "not_numeric",
          message:
            "Enter additional cash as a number without currency symbols or separators, or leave it blank.",
        },
      })
    ).toMatchObject({
      status: "unavailable",
      blockedBy: "additional_cash",
      title: "Additional cash assumption needs correction",
      currencyAuthority: { status: "available", currency: "USD" },
      preview: null,
    });
  });

  it("applies admitted additional cash only to the proposed portfolio posture", () => {
    const impact = buildProposalDraftImpactModel({
      positions: [position],
      cashAmount: 25_000,
      cashFlows: [],
      trades: [],
      requestedCurrency: "USD",
      portfolioEvidence: portfolioEvidence(),
      additionalCashAdmission: {
        status: "ready",
        inputState: "positive",
        amount: 10_000,
      },
    });

    expect(impact).toMatchObject({
      status: "available",
      preview: {
        currentPortfolioValue: 44_000,
        proposedPortfolioValue: 54_000,
        proposedCash: 35_000,
        cashDelta: 10_000,
      },
    });
  });

  it("withholds an aggregate projection when source cash pushes admitted cash beyond cent resolution", () => {
    expect(
      buildProposalDraftImpactModel({
        positions: [],
        cashAmount: 10_000,
        cashFlows: [],
        trades: [],
        requestedCurrency: "USD",
        portfolioEvidence: portfolioEvidence({ positions: [] }),
        additionalCashAdmission: {
          status: "ready",
          inputState: "positive",
          amount: 70368744177663.99,
        },
      })
    ).toMatchObject({
      status: "unavailable",
      blockedBy: "monetary_precision",
      title: "Draft amount exceeds the reliable preview range",
      currencyAuthority: { status: "available", currency: "USD" },
      preview: null,
    });
  });

  it("withholds projection when an active cash movement uses another currency", () => {
    expect(
      buildProposalDraftCurrencyAuthority({
        requestedCurrency: "USD",
        portfolioEvidence: portfolioEvidence(),
        cashFlows: [cashFlow("EUR")],
        trades: [],
      })
    ).toMatchObject({
      status: "mixed_currency",
      currency: null,
      conflictingCurrencies: ["EUR"],
    });
  });

  it("requires valid currency identity for every active monetary input", () => {
    expect(
      buildProposalDraftCurrencyAuthority({
        requestedCurrency: "USD",
        portfolioEvidence: portfolioEvidence(),
        cashFlows: [cashFlow("US")],
        trades: [],
      })
    ).toMatchObject({
      status: "unresolved",
      currency: null,
    });
  });

  it("keeps a manual-only scenario explicitly in the requested proposal currency", () => {
    expect(
      buildProposalDraftCurrencyAuthority({
        requestedCurrency: "USD",
        portfolioEvidence: portfolioEvidence({
          sourceCurrency: null,
          positions: [],
          cashAuthority: "manual_scenario",
        }),
        cashFlows: [cashFlow("USD")],
        trades: [],
      })
    ).toMatchObject({
      status: "available",
      currency: "USD",
      sourceCurrency: null,
    });
  });

  it("withholds projection when a priced draft order uses another currency", () => {
    expect(
      buildProposalDraftCurrencyAuthority({
        requestedCurrency: "USD",
        portfolioEvidence: portfolioEvidence(),
        cashFlows: [],
        trades: [pricedTrade("EUR")],
      })
    ).toMatchObject({
      status: "mixed_currency",
      currency: null,
      conflictingCurrencies: ["EUR"],
    });
  });

  it("requires currency authority for every active priced draft order", () => {
    expect(
      buildProposalDraftImpactModel({
        positions: [position],
        cashAmount: 25_000,
        cashFlows: [],
        trades: [pricedTrade(null)],
        requestedCurrency: "USD",
        portfolioEvidence: portfolioEvidence(),
      })
    ).toMatchObject({
      status: "unavailable",
      currencyAuthority: { status: "unresolved" },
      preview: null,
    });
  });
});
