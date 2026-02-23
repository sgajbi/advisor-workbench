import { PortfolioBundlePayload } from "./types";

export type CreatePortfolioInput = {
  portfolioId: string;
  baseCurrency: string;
  openDate: string;
  riskExposure: string;
  investmentTimeHorizon: string;
  portfolioType: string;
  bookingCenter: string;
  cifId: string;
  advisorId: string;
  status: string;
};

export type PositionInput = {
  portfolioId: string;
  baseCurrency: string;
  securityId: string;
  instrumentName: string;
  isin: string;
  productType: string;
  quantity: number;
  price: number;
  effectiveDate: string;
  transactionType: string;
};

export type TransactionInput = {
  portfolioId: string;
  baseCurrency: string;
  securityId: string;
  quantity: number;
  price: number;
  transactionDate: string;
  transactionType: string;
};

export type InstrumentInput = {
  securityId: string;
  name: string;
  isin: string;
  instrumentCurrency: string;
  productType: string;
  assetClass: string;
};

export type MarketDataInput = {
  securityId: string;
  priceDate: string;
  price: number;
  currency: string;
};

function basePayload(sourceSystem: string): PortfolioBundlePayload {
  return {
    sourceSystem,
    mode: "UPSERT",
    businessDates: [],
    portfolios: [],
    instruments: [],
    transactions: [],
    marketPrices: [],
    fxRates: [],
  };
}

export function buildCreatePortfolioPayload(input: CreatePortfolioInput): PortfolioBundlePayload {
  const payload = basePayload("ADVISOR_WORKBENCH_UI_CREATE_PORTFOLIO");
  payload.businessDates = [{ businessDate: input.openDate }];
  payload.portfolios = [
    {
      portfolioId: input.portfolioId,
      baseCurrency: input.baseCurrency,
      openDate: input.openDate,
      riskExposure: input.riskExposure,
      investmentTimeHorizon: input.investmentTimeHorizon,
      portfolioType: input.portfolioType,
      bookingCenter: input.bookingCenter,
      cifId: input.cifId,
      advisorId: input.advisorId,
      status: input.status,
    },
  ];
  return payload;
}

export function buildPositionSeedPayload(input: PositionInput): PortfolioBundlePayload {
  return buildPositionSeedPayloadFromList(input.portfolioId, input.baseCurrency, [input]);
}

export function buildPositionSeedPayloadFromList(
  portfolioId: string,
  baseCurrency: string,
  rows: PositionInput[]
): PortfolioBundlePayload {
  const payload = basePayload("ADVISOR_WORKBENCH_UI_ADD_POSITIONS");
  payload.businessDates = rows.length > 0 ? [{ businessDate: rows[0].effectiveDate }] : [];
  payload.instruments = rows.map((row) => ({
    securityId: row.securityId,
    name: row.instrumentName,
    isin: row.isin,
    instrumentCurrency: baseCurrency,
    productType: row.productType,
    assetClass: row.productType,
  }));
  payload.transactions = rows.map((row, index) => ({
    transaction_id: `TRN_${portfolioId}_${row.securityId}_${Date.now()}_${index + 1}`,
    portfolio_id: portfolioId,
    instrument_id: row.securityId,
    security_id: row.securityId,
    transaction_date: `${row.effectiveDate}T00:00:00Z`,
    transaction_type: row.transactionType,
    quantity: row.quantity,
    price: row.price,
    gross_transaction_amount: row.quantity * row.price,
    trade_currency: baseCurrency,
    currency: baseCurrency,
  }));
  payload.marketPrices = rows.map((row) => ({
    securityId: row.securityId,
    priceDate: row.effectiveDate,
    price: row.price,
    currency: baseCurrency,
  }));
  return payload;
}

export function buildTransactionsPayload(input: TransactionInput): PortfolioBundlePayload {
  return buildTransactionsPayloadFromList(input.portfolioId, input.baseCurrency, [input]);
}

export function buildTransactionsPayloadFromList(
  portfolioId: string,
  baseCurrency: string,
  rows: TransactionInput[]
): PortfolioBundlePayload {
  const payload = basePayload("ADVISOR_WORKBENCH_UI_ADD_TRANSACTIONS");
  payload.businessDates = rows.length > 0 ? [{ businessDate: rows[0].transactionDate }] : [];
  payload.transactions = rows.map((row, index) => ({
    transaction_id: `TRN_${portfolioId}_${row.securityId}_${Date.now()}_${index + 1}`,
    portfolio_id: portfolioId,
    instrument_id: row.securityId,
    security_id: row.securityId,
    transaction_date: `${row.transactionDate}T00:00:00Z`,
    transaction_type: row.transactionType,
    quantity: row.quantity,
    price: row.price,
    gross_transaction_amount: row.quantity * row.price,
    trade_currency: baseCurrency,
    currency: baseCurrency,
  }));
  return payload;
}

export function buildInstrumentsPayload(input: InstrumentInput): PortfolioBundlePayload {
  return buildInstrumentsPayloadFromList([input]);
}

export function buildInstrumentsPayloadFromList(rows: InstrumentInput[]): PortfolioBundlePayload {
  const payload = basePayload("ADVISOR_WORKBENCH_UI_ADD_INSTRUMENTS");
  payload.instruments = rows.map((row) => ({
    securityId: row.securityId,
    name: row.name,
    isin: row.isin,
    instrumentCurrency: row.instrumentCurrency,
    productType: row.productType,
    assetClass: row.assetClass,
  }));
  return payload;
}

export function buildMarketDataPayload(input: MarketDataInput): PortfolioBundlePayload {
  return buildMarketDataPayloadFromList([input]);
}

export function buildMarketDataPayloadFromList(rows: MarketDataInput[]): PortfolioBundlePayload {
  const payload = basePayload("ADVISOR_WORKBENCH_UI_ADD_MARKET_DATA");
  payload.businessDates = rows.length > 0 ? [{ businessDate: rows[0].priceDate }] : [];
  payload.marketPrices = rows.map((row) => ({
    securityId: row.securityId,
    priceDate: row.priceDate,
    price: row.price,
    currency: row.currency,
  }));
  return payload;
}
