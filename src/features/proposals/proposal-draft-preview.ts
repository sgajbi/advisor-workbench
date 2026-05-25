import type { PortfolioPositionView } from "@/apps/portfolio/types";

import type { CashFlowIntentInput, TradeIntentInput } from "./simulation-payload";

export type ProposalDraftCashFlowIntent = CashFlowIntentInput & {
  id: string;
};

export type ProposalDraftTradeIntent = TradeIntentInput & {
  id: string;
  source: "HELD_POSITION" | "NEW_INSTRUMENT";
  instrumentName?: string;
  assetClass?: string;
  referencePrice?: number;
};

export type DraftPositionPreviewRow = {
  key: string;
  instrumentId: string;
  instrumentName: string;
  assetClass: string;
  currentQuantity: number;
  proposedQuantity: number;
  currentValue: number;
  proposedValue: number;
  deltaValue: number;
};

export type AllocationPreviewRow = {
  assetClass: string;
  currentValue: number;
  proposedValue: number;
  currentWeight: number;
  proposedWeight: number;
};

export type ProposalDraftPreview = {
  rows: DraftPositionPreviewRow[];
  allocationRows: AllocationPreviewRow[];
  currentPortfolioValue: number;
  proposedPortfolioValue: number;
  proposedCash: number;
  cashDelta: number;
  tradeNotional: number;
  unpricedTradeCount: number;
  currentLargestWeight: number;
  proposedLargestWeight: number;
};

export function createCashFlowIntent(
  index: number,
  baseCurrency: string
): ProposalDraftCashFlowIntent {
  return {
    id: `cash_${index}`,
    currency: baseCurrency,
    amount: 0,
    direction: "IN",
    description: "",
  };
}

export function createTradeIntent(index: number): ProposalDraftTradeIntent {
  return {
    id: `trade_${index}`,
    source: "NEW_INSTRUMENT",
    side: "BUY",
    instrumentId: "",
    quantity: 0,
    instrumentName: "",
    assetClass: "",
    referencePrice: 0,
  };
}

export function createTradeIntentFromPosition(
  index: number,
  position: PortfolioPositionView,
  side: "BUY" | "SELL"
): ProposalDraftTradeIntent {
  return {
    id: `trade_${index}`,
    source: "HELD_POSITION",
    side,
    instrumentId: position.security_id,
    quantity: 0,
    instrumentName: position.instrument_name,
    assetClass: position.asset_class ?? "Unclassified",
    referencePrice: inferReferencePrice(position),
  };
}

export function inferReferencePrice(position: PortfolioPositionView): number {
  if (position.market_price && position.market_price > 0) {
    return position.market_price;
  }
  if (position.market_value_base && position.quantity > 0) {
    return position.market_value_base / position.quantity;
  }
  return 0;
}

export function formatCurrencyValue(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
}

export function formatUnitValue(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
}

export function formatPercentValue(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function buildProposalDraftPreview(
  positions: PortfolioPositionView[],
  cashAmount: number,
  cashFlows: ProposalDraftCashFlowIntent[],
  trades: ProposalDraftTradeIntent[]
): ProposalDraftPreview {
  const rowMap = new Map<string, DraftPositionPreviewRow>();
  positions.forEach((position) => {
    const currentValue = position.market_value_base ?? 0;
    rowMap.set(position.security_id, {
      key: position.security_id,
      instrumentId: position.security_id,
      instrumentName: position.instrument_name,
      assetClass: position.asset_class ?? "Unclassified",
      currentQuantity: position.quantity,
      proposedQuantity: position.quantity,
      currentValue,
      proposedValue: currentValue,
      deltaValue: 0,
    });
  });

  let tradeNotional = 0;
  let unpricedTradeCount = 0;
  trades.forEach((trade) => {
    if (!trade.instrumentId.trim() || trade.quantity <= 0) {
      return;
    }

    const price = trade.referencePrice ?? 0;
    if (price <= 0) {
      unpricedTradeCount += 1;
      return;
    }

    const instrumentId = trade.instrumentId.trim();
    const existing = rowMap.get(instrumentId);
    const row =
      existing ??
      {
        key: instrumentId,
        instrumentId,
        instrumentName: trade.instrumentName?.trim() || instrumentId,
        assetClass: trade.assetClass?.trim() || "New Instrument",
        currentQuantity: 0,
        proposedQuantity: 0,
        currentValue: 0,
        proposedValue: 0,
        deltaValue: 0,
      };

    const quantityDelta = trade.side === "SELL" ? -trade.quantity : trade.quantity;
    row.proposedQuantity = Math.max(0, row.proposedQuantity + quantityDelta);
    row.proposedValue = Math.max(0, row.proposedQuantity * price);
    row.deltaValue = row.proposedValue - row.currentValue;
    rowMap.set(instrumentId, row);
    tradeNotional += trade.side === "SELL" ? -(trade.quantity * price) : trade.quantity * price;
  });

  const cashDelta = cashFlows.reduce((sum, item) => {
    const amount = Math.abs(item.amount || 0);
    return item.direction === "OUT" ? sum - amount : sum + amount;
  }, 0);
  const rows = Array.from(rowMap.values()).sort(
    (left, right) => right.proposedValue - left.proposedValue
  );
  const currentPositionValue = rows.reduce((sum, row) => sum + row.currentValue, 0);
  const proposedPositionValue = rows.reduce((sum, row) => sum + row.proposedValue, 0);
  const currentPortfolioValue = currentPositionValue + cashAmount;
  const proposedCash = Math.max(0, cashAmount + cashDelta - tradeNotional);
  const proposedPortfolioValue = proposedPositionValue + proposedCash;

  const allocationMap = new Map<string, { currentValue: number; proposedValue: number }>();
  rows.forEach((row) => {
    const current = allocationMap.get(row.assetClass) ?? { currentValue: 0, proposedValue: 0 };
    current.currentValue += row.currentValue;
    current.proposedValue += row.proposedValue;
    allocationMap.set(row.assetClass, current);
  });
  allocationMap.set("Cash", {
    currentValue: cashAmount,
    proposedValue: proposedCash,
  });

  const allocationRows = Array.from(allocationMap.entries())
    .map(([assetClass, values]) => ({
      assetClass,
      currentValue: values.currentValue,
      proposedValue: values.proposedValue,
      currentWeight: currentPortfolioValue > 0 ? (values.currentValue / currentPortfolioValue) * 100 : 0,
      proposedWeight:
        proposedPortfolioValue > 0 ? (values.proposedValue / proposedPortfolioValue) * 100 : 0,
    }))
    .sort((left, right) => right.proposedValue - left.proposedValue);

  const currentLargestWeight =
    currentPortfolioValue > 0
      ? Math.max(0, ...rows.map((row) => (row.currentValue / currentPortfolioValue) * 100))
      : 0;
  const proposedLargestWeight =
    proposedPortfolioValue > 0
      ? Math.max(0, ...rows.map((row) => (row.proposedValue / proposedPortfolioValue) * 100))
      : 0;

  return {
    rows,
    allocationRows,
    currentPortfolioValue,
    proposedPortfolioValue,
    proposedCash,
    cashDelta,
    tradeNotional,
    unpricedTradeCount,
    currentLargestWeight,
    proposedLargestWeight,
  };
}
