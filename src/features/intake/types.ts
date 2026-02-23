export type PortfolioBundlePayload = {
  sourceSystem: string;
  mode: "UPSERT" | "REPLACE";
  businessDates: Array<{ businessDate: string }>;
  portfolios: Array<{
    portfolioId: string;
    baseCurrency: string;
    openDate: string;
    riskExposure: string;
    investmentTimeHorizon: string;
    portfolioType: string;
    bookingCenter: string;
    cifId: string;
    status: string;
    advisorId?: string;
    objective?: string;
  }>;
  instruments: Array<{
    securityId: string;
    name: string;
    isin: string;
    instrumentCurrency: string;
    productType: string;
    assetClass?: string;
  }>;
  transactions: Array<{
    transaction_id: string;
    portfolio_id: string;
    instrument_id: string;
    security_id: string;
    transaction_date: string;
    transaction_type: string;
    quantity: number;
    price: number;
    gross_transaction_amount: number;
    trade_currency: string;
    currency: string;
  }>;
  marketPrices: Array<{
    securityId: string;
    priceDate: string;
    price: number;
    currency: string;
  }>;
  fxRates: Array<unknown>;
};

export type IntakeEnvelopeResponse = {
  correlation_id: string;
  contract_version: string;
  data: {
    message?: string;
    published_counts?: Record<string, number>;
    [key: string]: unknown;
  };
};
