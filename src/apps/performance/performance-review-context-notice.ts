import {
  buildWorkbenchSourceContextNotice,
  combineWorkbenchContextNotices,
  type WorkbenchSourceContextNotice,
} from "@/design-system";
import type { WorkbenchPerformanceWorkspaceSummary } from "@/features/workbench/types";

export function buildPerformanceReviewContextNotice({
  requestedAsOfDate,
  requestedReportingCurrency,
  source,
}: {
  requestedAsOfDate?: string;
  requestedReportingCurrency?: string;
  source: WorkbenchPerformanceWorkspaceSummary | null;
}): WorkbenchSourceContextNotice | null {
  const title = "Performance source context";
  const dateNotice = buildWorkbenchSourceContextNotice({
    title,
    subject: "Performance",
    requestedAsOfDate,
    sourceAsOfDate: source?.effective_as_of_date,
  });
  const currencyNotice = buildCurrencyNotice({
    title,
    requestedReportingCurrency,
    source,
  });

  return combineWorkbenchContextNotices({
    title,
    notices: [dateNotice, currencyNotice],
  });
}

function buildCurrencyNotice({
  title,
  requestedReportingCurrency,
  source,
}: {
  title: string;
  requestedReportingCurrency?: string;
  source: WorkbenchPerformanceWorkspaceSummary | null;
}): WorkbenchSourceContextNotice | null {
  const requested = normalizeCurrency(requestedReportingCurrency);
  const base = normalizeCurrency(source?.portfolio.base_currency);
  if (!requested || !base || requested === base) {
    return null;
  }

  const effective = normalizeCurrency(source?.effective_reporting_currency);
  if (
    source?.reporting_currency_state === "applied" &&
    effective === requested
  ) {
    return null;
  }

  const reason =
    source?.reporting_currency_state === "accepted_unverified"
      ? `restatement to ${requested} has not been verified by the calculation source`
      : source?.reporting_currency_state === "rejected"
        ? `the requested ${requested} restatement was not accepted`
        : `restatement evidence for ${requested} is unavailable`;

  return {
    title,
    body: `Performance remains in portfolio base currency ${base} because ${reason}.`,
  };
}

function normalizeCurrency(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}
