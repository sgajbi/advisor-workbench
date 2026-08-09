import type {
  CreatePortfolioDraft,
  IntakeDraft,
  InstrumentsDraft,
  MarketDataDraft,
  PositionsDraft,
  TransactionsDraft,
} from "./draft";
import type { PortfolioBundlePayload } from "./types";

const trim = (value: string): string => value.trim();
const normalizeCode = (value: string): string => value.trim().toUpperCase();

/**
 * Produces the single, immutable business intent used by validation, review,
 * idempotency, source publication, and receipt reconciliation.
 */
export function normalizeIntakeDraft(draft: IntakeDraft): IntakeDraft {
  switch (draft.task) {
    case "CREATE_PORTFOLIO":
      return normalizePortfolioDraft(draft);
    case "ADD_POSITIONS":
      return normalizePositionsDraft(draft);
    case "ADD_TRANSACTIONS":
      return normalizeTransactionsDraft(draft);
    case "ADD_INSTRUMENTS":
      return normalizeInstrumentsDraft(draft);
    case "ADD_MARKET_DATA":
      return normalizeMarketDataDraft(draft);
    case "IMPORT_FILE":
      return {
        ...draft,
        fileName: draft.fileName?.trim() || null,
        payload: draft.payload ? normalizePortfolioBundlePayload(draft.payload) : null,
      };
  }
}

export function normalizePortfolioBundlePayload(
  payload: PortfolioBundlePayload,
): PortfolioBundlePayload {
  return {
    ...payload,
    sourceSystem: trim(payload.sourceSystem),
    businessDates: payload.businessDates.map(({ businessDate }) => ({
      businessDate: trim(businessDate),
    })),
    portfolios: payload.portfolios.map((portfolio) => ({
      ...portfolio,
      portfolioId: trim(portfolio.portfolioId),
      baseCurrency: normalizeCode(portfolio.baseCurrency),
      openDate: trim(portfolio.openDate),
      riskExposure: trim(portfolio.riskExposure),
      investmentTimeHorizon: trim(portfolio.investmentTimeHorizon),
      portfolioType: trim(portfolio.portfolioType),
      bookingCenter: trim(portfolio.bookingCenter),
      cifId: trim(portfolio.cifId),
      status: trim(portfolio.status),
      advisorId: portfolio.advisorId === undefined ? undefined : trim(portfolio.advisorId),
      objective: portfolio.objective === undefined ? undefined : trim(portfolio.objective),
    })),
    instruments: payload.instruments.map((instrument) => ({
      ...instrument,
      securityId: trim(instrument.securityId),
      name: trim(instrument.name),
      isin: normalizeCode(instrument.isin),
      instrumentCurrency: normalizeCode(instrument.instrumentCurrency),
      productType: trim(instrument.productType),
      assetClass: instrument.assetClass === undefined ? undefined : trim(instrument.assetClass),
    })),
    transactions: payload.transactions.map((transaction) => ({
      ...transaction,
      transaction_id: trim(transaction.transaction_id),
      portfolio_id: trim(transaction.portfolio_id),
      instrument_id: trim(transaction.instrument_id),
      security_id: trim(transaction.security_id),
      transaction_date: trim(transaction.transaction_date),
      transaction_type: normalizeCode(transaction.transaction_type),
      trade_currency: normalizeCode(transaction.trade_currency),
      currency: normalizeCode(transaction.currency),
    })),
    marketPrices: payload.marketPrices.map((price) => ({
      ...price,
      securityId: trim(price.securityId),
      priceDate: trim(price.priceDate),
      currency: normalizeCode(price.currency),
    })),
    fxRates: [...payload.fxRates],
  };
}

function normalizePortfolioDraft(draft: CreatePortfolioDraft): CreatePortfolioDraft {
  return {
    ...draft,
    input: {
      ...draft.input,
      portfolioId: trim(draft.input.portfolioId),
      baseCurrency: normalizeCode(draft.input.baseCurrency),
      openDate: trim(draft.input.openDate),
      riskExposure: trim(draft.input.riskExposure),
      investmentTimeHorizon: trim(draft.input.investmentTimeHorizon),
      portfolioType: trim(draft.input.portfolioType),
      bookingCenter: trim(draft.input.bookingCenter),
      cifId: trim(draft.input.cifId),
      advisorId: trim(draft.input.advisorId),
      status: trim(draft.input.status),
    },
  };
}

function normalizePositionsDraft(draft: PositionsDraft): PositionsDraft {
  return {
    ...draft,
    portfolioId: trim(draft.portfolioId),
    baseCurrency: normalizeCode(draft.baseCurrency),
    rows: draft.rows.map((row) => ({
      ...row,
      value: {
        ...row.value,
        securityId: trim(row.value.securityId),
        instrumentName: trim(row.value.instrumentName),
        isin: normalizeCode(row.value.isin),
        productType: trim(row.value.productType),
        effectiveDate: trim(row.value.effectiveDate),
        transactionType: normalizeCode(row.value.transactionType),
      },
    })),
  };
}

function normalizeTransactionsDraft(draft: TransactionsDraft): TransactionsDraft {
  return {
    ...draft,
    portfolioId: trim(draft.portfolioId),
    baseCurrency: normalizeCode(draft.baseCurrency),
    rows: draft.rows.map((row) => ({
      ...row,
      value: {
        ...row.value,
        securityId: trim(row.value.securityId),
        transactionDate: trim(row.value.transactionDate),
        transactionType: normalizeCode(row.value.transactionType),
      },
    })),
  };
}

function normalizeInstrumentsDraft(draft: InstrumentsDraft): InstrumentsDraft {
  return {
    ...draft,
    rows: draft.rows.map((row) => ({
      ...row,
      value: {
        ...row.value,
        securityId: trim(row.value.securityId),
        name: trim(row.value.name),
        isin: normalizeCode(row.value.isin),
        instrumentCurrency: normalizeCode(row.value.instrumentCurrency),
        productType: trim(row.value.productType),
        assetClass: trim(row.value.assetClass),
      },
    })),
  };
}

function normalizeMarketDataDraft(draft: MarketDataDraft): MarketDataDraft {
  return {
    ...draft,
    rows: draft.rows.map((row) => ({
      ...row,
      value: {
        ...row.value,
        securityId: trim(row.value.securityId),
        priceDate: trim(row.value.priceDate),
        currency: normalizeCode(row.value.currency),
      },
    })),
  };
}
