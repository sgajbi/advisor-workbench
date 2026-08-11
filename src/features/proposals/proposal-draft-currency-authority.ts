import type { PortfolioPositionView } from "@/apps/portfolio/types";
import {
  buildProposalDraftPreview,
  type ProposalDraftCashFlowIntent,
  type ProposalDraftPreview,
  type ProposalDraftTradeIntent,
} from "./proposal-draft-preview";
import type { ProposalPortfolioEvidenceModel } from "./proposal-portfolio-evidence";

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
      currencyAuthority: Exclude<ProposalDraftCurrencyAuthority, { status: "available" }>;
      preview: null;
    };

export function buildProposalDraftImpactModel({
  positions,
  cashAmount,
  cashFlows,
  trades,
  requestedCurrency,
  portfolioEvidence,
}: {
  positions: PortfolioPositionView[];
  cashAmount: number;
  cashFlows: ProposalDraftCashFlowIntent[];
  trades: ProposalDraftTradeIntent[];
  requestedCurrency: string;
  portfolioEvidence: ProposalPortfolioEvidenceModel;
}): ProposalDraftImpactModel {
  const currencyAuthority = buildProposalDraftCurrencyAuthority({
    requestedCurrency,
    portfolioEvidence,
    cashFlows,
  });

  if (currencyAuthority.status !== "available") {
    return { status: "unavailable", currencyAuthority, preview: null };
  }

  return {
    status: "available",
    currencyAuthority,
    preview: buildProposalDraftPreview(positions, cashAmount, cashFlows, trades),
  };
}

export function buildProposalDraftCurrencyAuthority({
  requestedCurrency,
  portfolioEvidence,
  cashFlows,
}: {
  requestedCurrency: string;
  portfolioEvidence: ProposalPortfolioEvidenceModel;
  cashFlows: ProposalDraftCashFlowIntent[];
}): ProposalDraftCurrencyAuthority {
  const requested = currencyCodeOrNull(requestedCurrency);
  const source = currencyCodeOrNull(portfolioEvidence.context.effectiveCurrency);
  const hasSourceValues =
    portfolioEvidence.positions.items.length > 0 ||
    portfolioEvidence.cash.authority === "portfolio_book";
  const activeCashFlowCurrencies = cashFlows
    .filter((cashFlow) => Number.isFinite(cashFlow.amount) && Math.abs(cashFlow.amount) > 0)
    .map((cashFlow) => currencyCodeOrNull(cashFlow.currency));

  if (!requested || (hasSourceValues && !source) || activeCashFlowCurrencies.includes(null)) {
    return {
      status: "unresolved",
      currency: null,
      requestedCurrency: requested,
      sourceCurrency: source,
      conflictingCurrencies: [],
      title: "Currency context is incomplete",
      body:
        "Monetary totals and allocation projections are withheld until the portfolio and every active cash movement have a confirmed three-letter currency.",
    };
  }

  const conflictingCurrencies = Array.from(
    new Set(
      [hasSourceValues ? source : null, ...activeCashFlowCurrencies].filter(
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
      ? `Source portfolio values and active draft entries share ${requested} as their currency authority.`
      : `Manual scenario values and active draft entries use ${requested}; no source portfolio values are included.`,
  };
}

function currencyCodeOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}
