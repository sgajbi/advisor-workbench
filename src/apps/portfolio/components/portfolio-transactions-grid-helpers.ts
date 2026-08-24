import type { PortfolioTransactionDrilldownFilter, PortfolioTransactionView } from "../types";
import { formatBusinessDate, formatStatus } from "../formatters";
import { PORTFOLIO_CURRENCY_LABELS } from "../portfolio-terminology";
import {
  buildPortfolioTransactionSettlementState,
  type PortfolioTransactionSettlementState,
} from "../portfolio-transaction-settlement-view-model";

export type TransactionRow = {
  transactionId: string;
  tradeDate: string;
  settleDate: string | null;
  type: string;
  instrument: string;
  securityId: string;
  quantity: number;
  price: number | null;
  grossAmount: number | null;
  transactionCurrency: string | null;
  netCostBase: number | null;
  realizedGainLossBase: number | null;
  priceCurrency: string;
  settlementState: PortfolioTransactionSettlementState;
  componentType: string | null;
  sourceSystem: string | null;
  raw: PortfolioTransactionView;
};

export type PortfolioTransactionLedgerQuery = {
  asOfDate?: string;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
  componentType?: string;
  securityId?: string;
  linkedTransactionGroupId?: string;
  fxContractId?: string;
  swapEventId?: string;
  nearLegGroupId?: string;
  farLegGroupId?: string;
  limit?: number;
  skip?: number;
};

export function buildTransactionFilterOptions(
  transactions: PortfolioTransactionView[],
  pickValue: (transaction: PortfolioTransactionView) => string | null | undefined
): string[] {
  return ["ALL", ...new Set(transactions.map(pickValue).filter(isNonEmptyString))];
}

export function shouldReuseInitialTransactions(params: {
  externalFilter: PortfolioTransactionDrilldownFilter | null | undefined;
  transactionType: string;
  componentType: string;
  startDate: string;
  endDate: string;
  defaultStartDate: string;
  defaultEndDate: string;
  initialTransactionCount: number;
  skip: number;
}): boolean {
  return (
    !params.externalFilter &&
    params.transactionType === "ALL" &&
    params.componentType === "ALL" &&
    params.startDate === params.defaultStartDate &&
    params.endDate === params.defaultEndDate &&
    params.skip === 0 &&
    params.initialTransactionCount > 0
  );
}

export function buildTransactionLedgerQuery(params: {
  asOfDate: string;
  startDate: string;
  endDate: string;
  transactionType: string;
  componentType: string;
  externalFilter: PortfolioTransactionDrilldownFilter | null | undefined;
  skip?: number;
}): PortfolioTransactionLedgerQuery {
  const query: PortfolioTransactionLedgerQuery = {
    asOfDate: params.asOfDate,
    startDate: params.startDate,
    endDate: params.endDate,
    transactionType: params.transactionType,
    componentType: params.componentType,
    limit: 200,
    skip: params.skip ?? 0,
  };

  switch (params.externalFilter?.kind) {
    case "security":
      query.securityId = params.externalFilter.security_id;
      break;
    case "linked_group":
      query.linkedTransactionGroupId =
        params.externalFilter.linked_transaction_group_id;
      break;
    case "fx_contract":
      query.fxContractId = params.externalFilter.fx_contract_id;
      break;
    case "swap_event":
      query.swapEventId = params.externalFilter.swap_event_id;
      break;
    case "near_leg_group":
      query.nearLegGroupId = params.externalFilter.near_leg_group_id;
      break;
    case "far_leg_group":
      query.farLegGroupId = params.externalFilter.far_leg_group_id;
      break;
    case "activity":
    case undefined:
      break;
  }

  return query;
}

export function buildTransactionRows(
  transactions: PortfolioTransactionView[],
  baseCurrency: string,
): TransactionRow[] {
  return transactions.map((transaction) => ({
    transactionId: transaction.transaction_id,
    tradeDate: transaction.transaction_date,
    settleDate: transaction.settlement_date ?? null,
    type: formatStatus(transaction.transaction_type),
    instrument: transaction.instrument_id,
    securityId: transaction.security_id,
    quantity: transaction.quantity,
    price: transaction.price ?? null,
    grossAmount: transaction.gross_amount ?? null,
    transactionCurrency: transaction.currency ?? null,
    netCostBase: transaction.net_cost_base ?? null,
    realizedGainLossBase: transaction.realized_gain_loss_base ?? null,
    priceCurrency: transaction.currency ?? baseCurrency,
    settlementState: buildPortfolioTransactionSettlementState(transaction),
    componentType: transaction.component_type ? formatStatus(transaction.component_type) : null,
    sourceSystem: transaction.source_system ? formatStatus(transaction.source_system) : null,
    raw: transaction,
  }));
}

export function formatTransactionLedgerCoverage(params: {
  total: number;
  skip: number;
  visibleCount: number;
}): string {
  if (!params.visibleCount) {
    return params.total ? `0 of ${params.total} ledger entries` : "No ledger entries";
  }

  const start = params.skip + 1;
  const end = Math.min(params.skip + params.visibleCount, params.total);
  return params.total > params.visibleCount || params.skip
    ? `${start}–${end} of ${params.total} ledger entries`
    : `${params.total} ledger ${params.total === 1 ? "entry" : "entries"}`;
}

export function buildTransactionExportRows(rows: TransactionRow[], baseCurrency: string) {
  return rows.map((row) => ({
    "Trade Date": formatBusinessDate(row.tradeDate),
    "Settle Date": formatBusinessDate(row.settleDate),
    Type: row.type,
    Instrument: row.instrument,
    Quantity: row.quantity,
    Price: row.price ?? "",
    [PORTFOLIO_CURRENCY_LABELS.transaction]: row.transactionCurrency ?? "",
    "Gross Amount": row.grossAmount ?? "",
    [`Net Cost (${baseCurrency})`]: row.netCostBase ?? "",
    [`Realised P&L (${baseCurrency})`]: row.realizedGainLossBase ?? "",
    "Settlement Status": row.settlementState.label,
    Component: row.componentType ?? "",
    Source: row.sourceSystem ?? "",
  }));
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}
