import type { WorkbenchPerformanceReviewContextEvidence } from "@/features/workbench/types";

export type PerformanceReviewContextRequest = Readonly<{
  asOfDate?: string;
  reportingCurrency?: string;
}>;

export type PerformanceReviewContextSource =
  WorkbenchPerformanceReviewContextEvidence & Readonly<{ as_of_date: string }>;

export function isPerformanceReviewContextCurrent(
  source: PerformanceReviewContextSource,
  request: PerformanceReviewContextRequest,
): boolean {
  if (
    source.effective_as_of_date !== source.as_of_date ||
    !source.effective_reporting_currency
  ) {
    return false;
  }

  const requestedAsOfDate = request.asOfDate?.trim() || null;
  if (source.requested_as_of_date !== requestedAsOfDate) {
    return false;
  }

  const requestedCurrency = normalizeCurrency(request.reportingCurrency);
  if (
    normalizeCurrency(source.requested_reporting_currency) !== requestedCurrency
  ) {
    return false;
  }

  if (source.reporting_currency_state !== "applied") {
    return true;
  }

  return Boolean(
    requestedCurrency &&
      normalizeCurrency(source.effective_reporting_currency) === requestedCurrency,
  );
}

export function arePerformanceReviewContextsCoherent(
  left: PerformanceReviewContextSource,
  right: PerformanceReviewContextSource,
): boolean {
  return (
    left.requested_as_of_date === right.requested_as_of_date &&
    left.effective_as_of_date === right.effective_as_of_date &&
    normalizeCurrency(left.requested_reporting_currency) ===
      normalizeCurrency(right.requested_reporting_currency) &&
    normalizeCurrency(left.effective_reporting_currency) ===
      normalizeCurrency(right.effective_reporting_currency) &&
    left.reporting_currency_state === right.reporting_currency_state
  );
}

export function getPerformanceDisplayCurrency(
  source: WorkbenchPerformanceReviewContextEvidence,
  baseCurrency: string,
): string {
  const requestedCurrency = normalizeCurrency(
    source.requested_reporting_currency,
  );
  const effectiveCurrency = normalizeCurrency(
    source.effective_reporting_currency,
  );

  if (
    source.reporting_currency_state === "applied" &&
    requestedCurrency &&
    effectiveCurrency === requestedCurrency
  ) {
    return effectiveCurrency;
  }

  return normalizeCurrency(baseCurrency) ?? baseCurrency;
}

function normalizeCurrency(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}
