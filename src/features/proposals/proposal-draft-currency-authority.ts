import type { PortfolioPositionView } from "@/apps/portfolio/types";
import {
  buildProposalDraftPreview,
  type ProposalDraftCashFlowIntent,
  type ProposalDraftPreview,
  type ProposalDraftTradeIntent,
} from "./proposal-draft-preview";
import type { ProposalPortfolioEvidenceModel } from "./proposal-portfolio-evidence";
import type { ProposalScenarioCashAdmission } from "./proposal-scenario-cash";

type ProposalDraftCurrencyAuthorityBase = {
  requestedCurrency: string | null;
  sourceCurrency: string | null;
  conflictingCurrencies: string[];
  title: string;
  body: string;
};

export type ProposalDraftCurrencyAuthority =
  | (ProposalDraftCurrencyAuthorityBase & {
      status: "available";
      currency: string;
    })
  | (ProposalDraftCurrencyAuthorityBase & {
      status: "mixed_currency" | "unresolved";
      currency: null;
    });

export type ProposalDraftImpactModel =
  | {
      status: "available";
      currencyAuthority: Extract<ProposalDraftCurrencyAuthority, { status: "available" }>;
      preview: ProposalDraftPreview;
    }
  | {
      status: "unavailable";
      blockedBy: "currency" | "additional_cash" | "monetary_precision";
      title: string;
      body: string;
      currencyAuthority: ProposalDraftCurrencyAuthority;
      preview: null;
    };

export function buildProposalDraftImpactModel({
  positions,
  cashAmount,
  cashFlows,
  trades,
  requestedCurrency,
  portfolioEvidence,
  additionalCashAdmission,
}: {
  positions: PortfolioPositionView[];
  cashAmount: number;
  cashFlows: ProposalDraftCashFlowIntent[];
  trades: ProposalDraftTradeIntent[];
  requestedCurrency: string;
  portfolioEvidence: ProposalPortfolioEvidenceModel;
  additionalCashAdmission?: ProposalScenarioCashAdmission;
}): ProposalDraftImpactModel {
  const currencyAuthority = buildProposalDraftCurrencyAuthority({
    requestedCurrency,
    portfolioEvidence,
    cashFlows,
    trades,
  });

  if (additionalCashAdmission?.status === "invalid") {
    return {
      status: "unavailable",
      blockedBy: "additional_cash",
      title: "Additional cash assumption needs correction",
      body: "Correct the value above to restore the indicative draft projection.",
      currencyAuthority,
      preview: null,
    };
  }

  if (currencyAuthority.status !== "available") {
    return {
      status: "unavailable",
      blockedBy: "currency",
      title: currencyAuthority.title,
      body: currencyAuthority.body,
      currencyAuthority,
      preview: null,
    };
  }

  const preview = buildProposalDraftPreview(
    positions,
    cashAmount,
    cashFlows,
    trades,
    additionalCashAdmission?.status === "ready" ? additionalCashAdmission.amount : 0
  );
  if (!hasReliableProposalDraftMonetaryPrecision(preview)) {
    return {
      status: "unavailable",
      blockedBy: "monetary_precision",
      title: "Draft amount exceeds the reliable preview range",
      body: "Reduce the additional cash assumption or draft amounts to restore an exact cent-distinguishable projection.",
      currencyAuthority,
      preview: null,
    };
  }

  return { status: "available", currencyAuthority, preview };
}

function hasReliableProposalDraftMonetaryPrecision(preview: ProposalDraftPreview): boolean {
  return preview.monetaryPrecisionReliable;
}

export function buildProposalDraftCurrencyAuthority({
  requestedCurrency,
  portfolioEvidence,
  cashFlows,
  trades,
}: {
  requestedCurrency: string;
  portfolioEvidence: ProposalPortfolioEvidenceModel;
  cashFlows: ProposalDraftCashFlowIntent[];
  trades: ProposalDraftTradeIntent[];
}): ProposalDraftCurrencyAuthority {
  const requested = currencyCodeOrNull(requestedCurrency);
  const source = currencyCodeOrNull(portfolioEvidence.context.effectiveCurrency);
  const hasSourceValues =
    portfolioEvidence.positions.items.length > 0 ||
    portfolioEvidence.cash.authority === "portfolio_book";
  const activeCashFlowCurrencies = cashFlows
    .filter((cashFlow) => Number.isFinite(cashFlow.amount) && Math.abs(cashFlow.amount) > 0)
    .map((cashFlow) => currencyCodeOrNull(cashFlow.currency));
  const activeTradePriceCurrencies = trades
    .filter(
      (trade) =>
        trade.instrumentId.trim().length > 0 &&
        Number.isFinite(trade.quantity) &&
        trade.quantity > 0 &&
        Number.isFinite(trade.referencePrice) &&
        (trade.referencePrice ?? 0) > 0
    )
    .map((trade) => currencyCodeOrNull(trade.referencePriceCurrency));

  if (
    !requested ||
    (hasSourceValues && !source) ||
    activeCashFlowCurrencies.includes(null) ||
    activeTradePriceCurrencies.includes(null)
  ) {
    return {
      status: "unresolved",
      currency: null,
      requestedCurrency: requested,
      sourceCurrency: source,
      conflictingCurrencies: [],
      title: "Currency context is incomplete",
      body:
        "Monetary totals and allocation projections are withheld until the portfolio, every active cash movement, and every priced draft order have a confirmed three-letter currency.",
    };
  }

  const conflictingCurrencies = Array.from(
    new Set(
      [
        hasSourceValues ? source : null,
        ...activeCashFlowCurrencies,
        ...activeTradePriceCurrencies,
      ].filter(
        (currency): currency is string => Boolean(currency && currency !== requested)
      )
    )
  ).sort();

  if (conflictingCurrencies.length > 0) {
    const conflictingContext = conflictingCurrencies.join(", ");
    return {
      status: "mixed_currency",
      currency: null,
      requestedCurrency: requested,
      sourceCurrency: source,
      conflictingCurrencies,
      title: "Currency-aligned impact is unavailable",
      body: `This ${requested} proposal includes monetary evidence in ${conflictingContext}. Totals and allocation projections remain withheld until one currency is confirmed or an approved source supplies conversion evidence.`,
    };
  }

  return {
    status: "available",
    currency: requested,
    requestedCurrency: requested,
    sourceCurrency: source,
    conflictingCurrencies: [],
    title: `${requested} currency context confirmed`,
    body: hasSourceValues
      ? `Source portfolio values, active cash movements, and priced draft orders share ${requested} as their currency authority.`
      : `Manual scenario values and priced draft entries use ${requested}; no source portfolio values are included.`,
  };
}

function currencyCodeOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}
