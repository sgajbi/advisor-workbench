import { ProposalSimulateRequest } from "./types";

export type SimulationFormValues = {
  portfolioId: string;
  baseCurrency: string;
  cashAmount: number;
};

export type CashFlowIntentInput = {
  currency: string;
  amount: number;
  direction: "IN" | "OUT";
  description?: string;
};

export type TradeIntentInput = {
  side: "BUY" | "SELL";
  instrumentId: string;
  quantity: number;
};

function toSignedCashAmount(intent: CashFlowIntentInput): string {
  const absolute = Math.abs(intent.amount || 0);
  const signed = intent.direction === "OUT" ? -absolute : absolute;
  return signed.toFixed(2);
}

export function buildSimulatePayload(
  values: SimulationFormValues,
  cashFlowIntents: CashFlowIntentInput[],
  tradeIntents: TradeIntentInput[]
): ProposalSimulateRequest {
  const baseCurrency = values.baseCurrency.toUpperCase();
  return {
    body: {
      portfolio_snapshot: {
        portfolio_id: values.portfolioId,
        base_currency: baseCurrency,
        positions: [],
        cash_balances: [
          {
            currency: baseCurrency,
            amount: values.cashAmount.toFixed(2),
          },
        ],
      },
      market_data_snapshot: {
        prices: [],
        fx_rates: [],
      },
      shelf_entries: [],
      options: {
        enable_proposal_simulation: true,
        proposal_apply_cash_flows_first: true,
        proposal_block_negative_cash: true,
      },
      proposed_cash_flows: cashFlowIntents
        .filter((item) => item.currency.trim().length > 0 && item.amount > 0)
        .map((item) => ({
          intent_type: "CASH_FLOW",
          currency: item.currency.toUpperCase(),
          amount: toSignedCashAmount(item),
          description: item.description?.trim() || undefined,
        })),
      proposed_trades: tradeIntents
        .filter((item) => item.instrumentId.trim().length > 0 && item.quantity > 0)
        .map((item) => ({
          intent_type: "SECURITY_TRADE",
          side: item.side,
          instrument_id: item.instrumentId.trim(),
          quantity: item.quantity.toFixed(4),
        })),
    },
  };
}
