import type { IntakeEnvelopeResponse } from "./contracts";
import type { IntakeTask } from "./draft";
import type { PortfolioBundlePayload } from "./types";

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

type ExpectedPublishedCount = {
  key: keyof typeof COUNT_LABELS;
  expected: number;
};

export function buildIntakeReceipt(
  task: IntakeTask,
  payload: PortfolioBundlePayload,
  response: IntakeEnvelopeResponse,
): IntakeReceipt {
  const entries = Object.entries(response.data.published_counts);
  const expectedCounts = expectedPublishedCounts(task, payload).filter((count) => count.expected > 0);
  const hasTaskEvidence = expectedCounts.length > 0 && expectedCounts.every(({ key, expected }) => {
    return response.data.published_counts[key] === expected;
  });

  if (!hasTaskEvidence) {
    throw new Error(
      "Portfolio intake confirmation did not include payload-matching published record counts for this request.",
    );
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

function expectedPublishedCounts(_task: IntakeTask, payload: PortfolioBundlePayload): ExpectedPublishedCount[] {
  return [
    { key: "business_dates", expected: payload.businessDates.length },
    { key: "portfolios", expected: payload.portfolios.length },
    { key: "instruments", expected: payload.instruments.length },
    { key: "transactions", expected: payload.transactions.length },
    { key: "market_prices", expected: payload.marketPrices.length },
    { key: "fx_rates", expected: payload.fxRates.length },
  ];
}
