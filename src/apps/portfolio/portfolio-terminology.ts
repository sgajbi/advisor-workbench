export const PORTFOLIO_VALUE_LABEL = "Portfolio value";

export const PORTFOLIO_VALUE_UNAVAILABLE_LABEL =
  "Portfolio value temporarily unavailable";

export const PORTFOLIO_VALUE_DRAWER_COPY = {
  title: PORTFOLIO_VALUE_LABEL,
  subtitle: "Current market value of the selected portfolio in its base currency.",
  definition: [
    "Portfolio value is the current base-currency market value of the selected portfolio.",
    "It combines invested holdings and available cash at the stated valuation date.",
  ],
} as const;

export function formatShareOfPortfolioValue(formattedWeight: string): string {
  return `${formattedWeight} of portfolio value`;
}
