import type {
  PortfolioCashBalance,
  PortfolioPositionView,
  PortfolioRecordDataAvailability,
  PortfolioTransactionView,
} from "./types";

export type PositionsReviewAvailability = {
  inventoryComplete: boolean;
  activityAvailable: boolean;
  partialState: {
    title: string;
    body: string;
    hint: string;
  } | null;
};

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

export function buildPositionsReviewAvailability(
  availability?: PortfolioRecordDataAvailability,
): PositionsReviewAvailability {
  const positionsAvailable = availability?.positions !== "unavailable";
  const liquidityAvailable = availability?.liquidity !== "unavailable";
  const activityAvailable = availability?.transactions !== "unavailable";
  const unavailableDetails = [
    !positionsAvailable ? "booked security detail" : null,
    !liquidityAvailable ? "cash-balance detail" : null,
    !activityAvailable ? "recent position activity" : null,
  ].filter((value): value is string => Boolean(value));
  const inventoryComplete = positionsAvailable && liquidityAvailable;

  if (!unavailableDetails.length) {
    return { inventoryComplete, activityAvailable, partialState: null };
  }

  return {
    inventoryComplete,
    activityAvailable,
    partialState: {
      title: "Positions review partially available",
      body: `${capitalizeFirst(formatBusinessList(unavailableDetails))} ${
        unavailableDetails.length === 1 ? "is" : "are"
      } temporarily unavailable. Available source records remain visible.`,
      hint: inventoryComplete
        ? "The booked inventory remains available; open Transactions when activity is restored for full ledger review."
        : "Portfolio totals above remain available from the source summary; the position inventory below is partial.",
    },
  };
}

function normalizeIdentifier(value: string): string {
  return value.trim().toUpperCase();
}

function formatBusinessList(items: string[]): string {
  if (items.length < 2) {
    return items[0] ?? "Record detail";
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function capitalizeFirst(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
