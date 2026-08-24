export const PERFORMANCE_RETURN_LABELS = {
  timeWeightedReturn: "Time-weighted return (TWR)",
  portfolioTwr: "Portfolio TWR",
  benchmarkTwr: "Benchmark TWR",
  activeReturn: "Active return",
  moneyWeightedReturn: "Money-weighted return (MWR)",
} as const;

export const PERFORMANCE_RETURN_TABLE_LABELS = {
  segmentTwr: "TWR",
  netTwr: "Net TWR",
  grossTwr: "Gross TWR",
  cumulativePortfolioTwr: "Cumulative portfolio TWR",
  cumulativeBenchmarkTwr: "Cumulative benchmark TWR",
  cumulativeActiveReturn: "Cumulative active return",
  cumulativeNetTwr: "Cumulative net TWR",
  cumulativeGrossTwr: "Cumulative gross TWR",
  annualisedNetTwr: "Annualised net TWR",
  annualisedGrossTwr: "Annualised gross TWR",
} as const;

export const PERFORMANCE_ECONOMICS_LABELS = {
  openingMarketValue: "Opening market value",
  endingMarketValue: "Ending market value",
  flowAdjustedMarketValue: "Flow-adjusted market value",
  openingCashFlow: "Opening cash flow",
  closingCashFlow: "Closing cash flow",
  netCashFlow: "Net cash flow",
} as const;

export const PERFORMANCE_RETURN_DEFINITIONS = {
  timeWeightedReturn:
    "Time-weighted return (TWR) measures portfolio performance while removing the effect of the timing and size of external cash flows.",
  activeReturn:
    "Portfolio time-weighted return less benchmark time-weighted return for the selected period.",
  moneyWeightedReturn:
    "Money-weighted return (MWR) reflects the timing and size of external cash flows during the selected period.",
} as const;

export const PERFORMANCE_FEE_BASIS_LABELS = {
  net: "Net of fees",
  gross: "Gross of fees",
  unavailable: "Fee basis not confirmed",
} as const;

export function getPerformanceFeeBasisLabel(basis: string | null | undefined): string {
  if (basis?.trim().toUpperCase() === "NET") {
    return PERFORMANCE_FEE_BASIS_LABELS.net;
  }
  if (basis?.trim().toUpperCase() === "GROSS") {
    return PERFORMANCE_FEE_BASIS_LABELS.gross;
  }
  return PERFORMANCE_FEE_BASIS_LABELS.unavailable;
}

export function getPerformanceReturnPathTitle(basis: string | null | undefined): string {
  return `Time-weighted return path · ${getPerformanceFeeBasisLabel(basis)}`;
}
