import type {
  PortfolioCashBalance,
  PortfolioPositionView,
  PortfolioTransactionView,
} from "./types";

export function buildBookedHoldingsInventory(
  positions: PortfolioPositionView[],
  cashBalances: PortfolioCashBalance[] = [],
): PortfolioPositionView[] {
  const positionIds = new Set(positions.map((position) => position.security_id));
  const cashHoldings = cashBalances
    .filter((balance) => !positionIds.has(balance.security_id))
    .map<PortfolioPositionView>((balance) => ({
      source_record_type: "cash_balance",
      security_id: balance.security_id,
      instrument_name: balance.instrument_name,
      asset_class: "Cash",
      currency: balance.currency,
      quantity: balance.quantity,
      market_value_base: balance.market_value_base ?? null,
      weight_pct: balance.weight_pct ?? null,
    }));

  return cashHoldings.length ? [...positions, ...cashHoldings] : positions;
}

export function filterRecentTransactionsForHolding(
  transactions: PortfolioTransactionView[],
  securityId: string,
): PortfolioTransactionView[] {
  const normalizedSecurityId = normalizeIdentifier(securityId);
  if (!normalizedSecurityId) {
    return [];
  }

  return transactions.filter(
    (transaction) =>
      normalizeIdentifier(transaction.security_id) === normalizedSecurityId ||
      normalizeIdentifier(transaction.instrument_id) === normalizedSecurityId,
  );
}

function normalizeIdentifier(value: string): string {
  return value.trim().toUpperCase();
}
