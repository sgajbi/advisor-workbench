import { formatCurrency, formatDate } from "./formatters";
import type {
  PortfolioCashflowOutlook,
  PortfolioPartialFailure,
  PortfolioProjectedCashflowResponse,
} from "./types";

export const CASHFLOW_HORIZON_OPTIONS = [
  { key: "10", label: "10D", days: 10 },
  { key: "30", label: "30D", days: 30 },
  { key: "90", label: "90D", days: 90 },
] as const;

export type CashflowHorizonKey = (typeof CASHFLOW_HORIZON_OPTIONS)[number]["key"];

export type CashflowProjectionSnapshot = {
  requestedHorizonDays: number;
  outlook: PortfolioCashflowOutlook;
  response: PortfolioProjectedCashflowResponse | null;
  warnings: string[];
  partialFailures: PortfolioPartialFailure[];
};

export function resolveCashflowHorizonKey(projectionDays?: number | null): CashflowHorizonKey {
  const option = CASHFLOW_HORIZON_OPTIONS.find((candidate) => candidate.days === projectionDays);
  return option?.key ?? CASHFLOW_HORIZON_OPTIONS[0].key;
}

export function resolveCashflowHorizonDays(key: CashflowHorizonKey): number {
  return CASHFLOW_HORIZON_OPTIONS.find((option) => option.key === key)?.days ?? 10;
}

export function buildInitialCashflowSnapshot({
  outlook,
  warnings,
  partialFailures,
}: {
  outlook: PortfolioCashflowOutlook | null;
  warnings: string[];
  partialFailures: PortfolioPartialFailure[];
}): CashflowProjectionSnapshot | null {
  if (!outlook) {
    return null;
  }

  return {
    requestedHorizonDays: outlook.projection_days,
    outlook,
    response: null,
    warnings,
    partialFailures,
  };
}

export function buildCashflowSnapshot(
  requestedHorizonDays: number,
  response: PortfolioProjectedCashflowResponse
): CashflowProjectionSnapshot | null {
  if (!response.cashflow_outlook) {
    return null;
  }

  return {
    requestedHorizonDays,
    outlook: response.cashflow_outlook,
    response,
    warnings: response.warnings,
    partialFailures: response.partial_failures,
  };
}

export function hasCashflowDegradation(snapshot: CashflowProjectionSnapshot): boolean {
  return snapshot.warnings.length > 0 || snapshot.partialFailures.length > 0;
}

export function hasProjectedCashMovements(outlook: PortfolioCashflowOutlook): boolean {
  return outlook.upcoming_points.some((point) => point.net_cashflow_base !== 0);
}

export function buildCashflowMovementRows(outlook: PortfolioCashflowOutlook) {
  return outlook.upcoming_points.filter((point) => point.net_cashflow_base !== 0);
}

export function buildCashflowScopeFacts(
  snapshot: CashflowProjectionSnapshot,
  baseCurrency: string
) {
  const { outlook } = snapshot;
  return [
    { label: "Projection as of", value: formatDate(outlook.as_of_date) },
    { label: "Through", value: formatDate(outlook.range_end_date) },
    { label: "Currency", value: baseCurrency },
    {
      label: "Projection basis",
      value: outlook.include_projected ? "Booked and projected events" : "Booked events only",
    },
  ];
}

export function buildCashflowResultLabel(snapshot: CashflowProjectionSnapshot): string {
  const returnedDays = snapshot.outlook.projection_days;
  if (returnedDays === snapshot.requestedHorizonDays) {
    return `${returnedDays}-day projection`;
  }
  return `${returnedDays}-day projection returned for a ${snapshot.requestedHorizonDays}-day request`;
}

export function buildCashflowExportRows(
  snapshot: CashflowProjectionSnapshot,
  baseCurrency: string
) {
  return snapshot.outlook.upcoming_points.map((point) => [
    formatDate(point.projection_date),
    formatCurrency(point.net_cashflow_base, baseCurrency),
    formatCurrency(point.projected_cumulative_cashflow_base, baseCurrency),
  ]);
}

export function buildCashflowExportFilename(
  snapshot: CashflowProjectionSnapshot,
  portfolioId: string
): string {
  return [
    "portfolio-projected-cash-movement",
    portfolioId,
    snapshot.outlook.as_of_date,
    `${snapshot.outlook.projection_days}d.csv`,
  ].join("-");
}

export function selectCashflowWarnings(warnings: string[]): string[] {
  return warnings.filter((warning) => warning.toUpperCase().includes("CASHFLOW"));
}

export function selectCashflowPartialFailures(partialFailures: PortfolioPartialFailure[]) {
  return partialFailures.filter((failure) => failure.error_code.toUpperCase().includes("CASHFLOW"));
}
