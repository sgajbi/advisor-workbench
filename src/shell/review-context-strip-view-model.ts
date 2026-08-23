import type {
  ReviewContextCurrency,
  ReviewContextStripModel,
} from "@/design-system";

export type ReviewContextSource = {
  portfolioName?: string | null;
  portfolioId?: string | null;
  clientId?: string | null;
  mandateType?: string | null;
  bookingCenter?: string | null;
  businessDate?: string | null;
  baseCurrency?: string | null;
  acceptedReportingCurrency?: string | null;
};

export function buildReviewContextStripModel(
  source: ReviewContextSource,
  notice?: ReviewContextStripModel["notice"],
): ReviewContextStripModel {
  const currency = buildReviewContextCurrency(source);
  const sourceState = [
    source.portfolioId,
    source.clientId,
    source.mandateType,
    source.bookingCenter,
    source.businessDate,
    currency?.value,
  ].every(Boolean)
    ? "confirmed"
    : "partial";

  return {
    portfolioName:
      source.portfolioName || source.portfolioId || "Portfolio context limited",
    portfolioId: source.portfolioId,
    clientId: source.clientId,
    mandateType: source.mandateType,
    bookingCenter: source.bookingCenter,
    businessDate: source.businessDate,
    currency,
    sourceState,
    ...(notice ? { notice } : {}),
  };
}

export function buildUnavailableReviewContextStrip(
  notice?: ReviewContextStripModel["notice"],
): ReviewContextStripModel {
  return {
    portfolioName: "Portfolio not confirmed",
    sourceState: "unavailable",
    ...(notice ? { notice } : {}),
  };
}

function buildReviewContextCurrency(
  source: ReviewContextSource,
): ReviewContextCurrency | null {
  if (
    source.acceptedReportingCurrency &&
    source.acceptedReportingCurrency !== source.baseCurrency
  ) {
    return { kind: "reporting", value: source.acceptedReportingCurrency };
  }
  return source.baseCurrency
    ? { kind: "base", value: source.baseCurrency }
    : null;
}
