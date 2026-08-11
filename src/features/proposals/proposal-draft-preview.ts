import type { PortfolioPositionView } from "@/apps/portfolio/types";

import type { CashFlowIntentInput, TradeIntentInput } from "./simulation-payload";
import { PROPOSAL_CENT_DISTINGUISHABLE_MINOR_LIMIT } from "./proposal-scenario-cash";

export type ProposalDraftCashFlowIntent = CashFlowIntentInput & {
  id: string;
};

export type ProposalDraftTradeIntent = TradeIntentInput & {
  id: string;
  source: "HELD_POSITION" | "NEW_INSTRUMENT";
  instrumentName?: string;
  assetClass?: string;
  referencePrice?: number;
  referencePriceCurrency?: string | null;
};

export type ExecutableProposalDraftTradeIntent = ProposalDraftTradeIntent & {
  requestedQuantity: number;
  executableQuantity: number;
  cappedToAvailableQuantity: boolean;
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
  monetaryPrecisionReliable: boolean;
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

export function createTradeIntent(
  index: number,
  referencePriceCurrency = ""
): ProposalDraftTradeIntent {
  return {
    id: `trade_${index}`,
    source: "NEW_INSTRUMENT",
    side: "BUY",
    instrumentId: "",
    quantity: 0,
    instrumentName: "",
    assetClass: "",
    referencePrice: 0,
    referencePriceCurrency,
  };
}

export function createTradeIntentFromPosition(
  index: number,
  position: PortfolioPositionView,
  side: "BUY" | "SELL",
  portfolioCurrency: string
): ProposalDraftTradeIntent {
  return {
    id: `trade_${index}`,
    source: "HELD_POSITION",
    side,
    instrumentId: position.security_id,
    quantity: 0,
    instrumentName: position.instrument_name,
    assetClass: position.asset_class ?? "Unclassified",
    referencePrice: inferBaseCurrencyReferencePrice(position),
    referencePriceCurrency: portfolioCurrency,
  };
}

export function inferBaseCurrencyReferencePrice(position: PortfolioPositionView): number {
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

export function buildExecutableTradeRows(
  positions: PortfolioPositionView[],
  trades: ProposalDraftTradeIntent[]
): ExecutableProposalDraftTradeIntent[] {
  const quantityByInstrument = new Map<string, number>();
  positions.forEach((position) => {
    quantityByInstrument.set(position.security_id, Math.max(0, position.quantity));
  });

  const executableRows: ExecutableProposalDraftTradeIntent[] = [];
  trades.forEach((trade) => {
    const instrumentId = trade.instrumentId.trim();
    if (!instrumentId || trade.quantity <= 0) {
      return;
    }

    const availableQuantity = Math.max(0, quantityByInstrument.get(instrumentId) ?? 0);
    const executableQuantity =
      trade.side === "SELL" ? Math.min(trade.quantity, availableQuantity) : trade.quantity;
    if (executableQuantity <= 0) {
      return;
    }

    quantityByInstrument.set(
      instrumentId,
      Math.max(0, availableQuantity + (trade.side === "SELL" ? -executableQuantity : executableQuantity))
    );
    executableRows.push({
      ...trade,
      instrumentId,
      requestedQuantity: trade.quantity,
      executableQuantity,
      cappedToAvailableQuantity: executableQuantity < trade.quantity,
    });
  });

  return executableRows;
}

export function buildProposalDraftPreview(
  positions: PortfolioPositionView[],
  cashAmount: number,
  cashFlows: ProposalDraftCashFlowIntent[],
  trades: ProposalDraftTradeIntent[],
  additionalCashAmount = 0
): ProposalDraftPreview {
  let monetaryPrecisionReliable = true;
  const monetaryInputs: bigint[] = [];
  const toMinorUnits = (value: number): bigint => {
    const minorUnits = proposalMoneyToMinorUnits(value);
    if (minorUnits === null) {
      monetaryPrecisionReliable = false;
      return 0n;
    }
    monetaryInputs.push(minorUnits);
    return minorUnits;
  };
  const rowMap = new Map<string, DraftPositionPreviewRow>();
  positions.forEach((position) => {
    const currentValue = proposalMoneyFromMinorUnits(
      toMinorUnits(position.market_value_base ?? 0)
    );
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

  let tradeNotionalMinorUnits = 0n;
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

    const executableQuantity =
      trade.side === "SELL" ? Math.min(trade.quantity, Math.max(0, row.proposedQuantity)) : trade.quantity;
    const quantityDelta = trade.side === "SELL" ? -executableQuantity : executableQuantity;
    row.proposedQuantity = Math.max(0, row.proposedQuantity + quantityDelta);
    const proposedValueMinorUnits = toMinorUnits(
      Math.max(0, row.proposedQuantity * price)
    );
    const currentValueMinorUnits = toMinorUnits(row.currentValue);
    row.proposedValue = proposalMoneyFromMinorUnits(proposedValueMinorUnits);
    row.deltaValue = proposalMoneyFromMinorUnits(
      proposedValueMinorUnits - currentValueMinorUnits
    );
    rowMap.set(instrumentId, row);
    const tradeNotional = toMinorUnits(executableQuantity * price);
    tradeNotionalMinorUnits += trade.side === "SELL" ? -tradeNotional : tradeNotional;
  });

  const cashFlowDeltaMinorUnits = cashFlows.reduce((sum, item) => {
    const amount = toMinorUnits(
      Number.isFinite(item.amount) ? Math.abs(item.amount) : Number.NaN
    );
    return item.direction === "OUT" ? sum - amount : sum + amount;
  }, 0n);
  const cashAmountMinorUnits = toMinorUnits(cashAmount);
  const additionalCashMinorUnits = toMinorUnits(additionalCashAmount);
  const cashDeltaMinorUnits = additionalCashMinorUnits + cashFlowDeltaMinorUnits;
  const rows = Array.from(rowMap.values()).sort(
    (left, right) => right.proposedValue - left.proposedValue
  );
  const currentPositionValueMinorUnits = rows.reduce(
    (sum, row) => sum + toMinorUnits(row.currentValue),
    0n
  );
  const proposedPositionValueMinorUnits = rows.reduce(
    (sum, row) => sum + toMinorUnits(row.proposedValue),
    0n
  );
  const currentPortfolioValueMinorUnits =
    currentPositionValueMinorUnits + cashAmountMinorUnits;
  const proposedCashMinorUnits = maxBigInt(
    0n,
    cashAmountMinorUnits + cashDeltaMinorUnits - tradeNotionalMinorUnits
  );
  const proposedPortfolioValueMinorUnits =
    proposedPositionValueMinorUnits + proposedCashMinorUnits;

  const allocationMap = new Map<
    string,
    { currentValueMinorUnits: bigint; proposedValueMinorUnits: bigint }
  >();
  rows.forEach((row) => {
    const current = allocationMap.get(row.assetClass) ?? {
      currentValueMinorUnits: 0n,
      proposedValueMinorUnits: 0n,
    };
    current.currentValueMinorUnits += toMinorUnits(row.currentValue);
    current.proposedValueMinorUnits += toMinorUnits(row.proposedValue);
    allocationMap.set(row.assetClass, current);
  });
  allocationMap.set("Cash", {
    currentValueMinorUnits: cashAmountMinorUnits,
    proposedValueMinorUnits: proposedCashMinorUnits,
  });

  const aggregateMinorUnits = [
    tradeNotionalMinorUnits,
    cashDeltaMinorUnits,
    currentPositionValueMinorUnits,
    proposedPositionValueMinorUnits,
    currentPortfolioValueMinorUnits,
    proposedCashMinorUnits,
    proposedPortfolioValueMinorUnits,
    ...Array.from(allocationMap.values()).flatMap((values) => [
      values.currentValueMinorUnits,
      values.proposedValueMinorUnits,
    ]),
  ];
  monetaryPrecisionReliable =
    monetaryPrecisionReliable &&
    [...monetaryInputs, ...aggregateMinorUnits].every(isCentDistinguishableMinorUnits);

  const currentPortfolioValue = proposalMoneyFromMinorUnits(
    currentPortfolioValueMinorUnits
  );
  const proposedPortfolioValue = proposalMoneyFromMinorUnits(
    proposedPortfolioValueMinorUnits
  );
  const proposedCash = proposalMoneyFromMinorUnits(proposedCashMinorUnits);

  const allocationRows = Array.from(allocationMap.entries())
    .map(([assetClass, values]) => ({
      assetClass,
      currentValue: proposalMoneyFromMinorUnits(values.currentValueMinorUnits),
      proposedValue: proposalMoneyFromMinorUnits(values.proposedValueMinorUnits),
      currentWeight:
        currentPortfolioValue > 0
          ? (proposalMoneyFromMinorUnits(values.currentValueMinorUnits) /
              currentPortfolioValue) *
            100
          : 0,
      proposedWeight:
        proposedPortfolioValue > 0
          ? (proposalMoneyFromMinorUnits(values.proposedValueMinorUnits) /
              proposedPortfolioValue) *
            100
          : 0,
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
    cashDelta: proposalMoneyFromMinorUnits(cashDeltaMinorUnits),
    tradeNotional: proposalMoneyFromMinorUnits(tradeNotionalMinorUnits),
    unpricedTradeCount,
    currentLargestWeight,
    proposedLargestWeight,
    monetaryPrecisionReliable,
  };
}

function proposalMoneyToMinorUnits(value: number): bigint | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const roundedMinorUnits = Math.round(value * 100);
  return Number.isSafeInteger(roundedMinorUnits) ? BigInt(roundedMinorUnits) : null;
}

function proposalMoneyFromMinorUnits(value: bigint): number {
  return Number(value) / 100;
}

function isCentDistinguishableMinorUnits(value: bigint): boolean {
  const magnitude = value < 0n ? -value : value;
  return magnitude < PROPOSAL_CENT_DISTINGUISHABLE_MINOR_LIMIT;
}

function maxBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}
