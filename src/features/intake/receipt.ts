import type { IntakeEnvelopeResponse } from "./contracts";
import type { IntakeTask } from "./draft";

export type IntakeReceipt = {
  title: string;
  description: string;
  correlationId: string;
  contractVersion: string;
  counts: Array<{ label: string; value: number }>;
};

const COUNT_LABELS: Record<string, string> = {
  portfolios: "Portfolios",
  instruments: "Instruments",
  transactions: "Transactions",
  market_prices: "Price observations",
  fx_rates: "FX rates",
  business_dates: "Business dates",
};

const EXPECTED_COUNT_KEYS: Record<IntakeTask, string[]> = {
  CREATE_PORTFOLIO: ["portfolios"],
  ADD_POSITIONS: ["instruments", "transactions", "market_prices"],
  ADD_TRANSACTIONS: ["transactions"],
  ADD_INSTRUMENTS: ["instruments"],
  ADD_MARKET_DATA: ["market_prices"],
  IMPORT_FILE: [],
};

export function buildIntakeReceipt(task: IntakeTask, response: IntakeEnvelopeResponse): IntakeReceipt {
  const entries = Object.entries(response.data.published_counts);
  const expectedKeys = EXPECTED_COUNT_KEYS[task];
  const hasTaskEvidence =
    task === "IMPORT_FILE"
      ? entries.some(([key]) => key in COUNT_LABELS)
      : expectedKeys.every((key) => Object.hasOwn(response.data.published_counts, key));

  if (!hasTaskEvidence) {
    throw new Error("Portfolio intake confirmation did not include the published record counts for this request.");
  }

  const counts = entries
    .filter(([key]) => key in COUNT_LABELS)
    .map(([key, value]) => ({ label: COUNT_LABELS[key], value }));

  return {
    title: "Publication confirmed",
    description:
      "The source service accepted the reviewed request. Downstream valuation, reporting, or activation readiness is not implied.",
    correlationId: response.correlation_id,
    contractVersion: response.contract_version,
    counts,
  };
}
