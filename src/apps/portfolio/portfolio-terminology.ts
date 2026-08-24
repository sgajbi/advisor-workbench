export const PORTFOLIO_VALUE_LABEL = "Portfolio value";

export const PORTFOLIO_VALUE_UNAVAILABLE_LABEL =
  "Portfolio value temporarily unavailable";

export const PORTFOLIO_VALUATION_DATE_LABEL = "Valuation date";
export const PORTFOLIO_REVIEW_DATE_LABEL = "Review date";

export const PORTFOLIO_VALUE_COPY = {
  title: PORTFOLIO_VALUE_LABEL,
  description:
    "Total portfolio market value in the portfolio base currency at the stated valuation date.",
  definition: [
    "Portfolio value is the current base-currency market value of the selected portfolio.",
    "It combines invested holdings and available cash at the stated valuation date.",
  ],
} as const;

export function formatShareOfPortfolioValue(formattedWeight: string): string {
  return `${formattedWeight} of portfolio value`;
}

export function buildPortfolioDateFacts(
  valuationDate: string,
  reviewDate: string,
): Array<{ label: string; date: string }> {
  return [
    { label: PORTFOLIO_VALUATION_DATE_LABEL, date: valuationDate },
    ...(reviewDate !== valuationDate
      ? [{ label: PORTFOLIO_REVIEW_DATE_LABEL, date: reviewDate }]
      : []),
  ];
}
