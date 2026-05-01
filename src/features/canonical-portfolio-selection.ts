export const CANONICAL_FRONT_OFFICE_PORTFOLIO_ID = "PB_SG_GLOBAL_BAL_001";

export const PREFERRED_FRONT_OFFICE_PORTFOLIO_IDS = [
  CANONICAL_FRONT_OFFICE_PORTFOLIO_ID,
  "DEMO_ADV_USD_001",
] as const;

export function resolvePreferredPortfolioId<T>(
  items: readonly T[],
  getPortfolioId: (item: T) => string | null | undefined
): string | null {
  const portfolioIds = items
    .map((item) => getPortfolioId(item)?.trim())
    .filter((item): item is string => Boolean(item));

  return (
    PREFERRED_FRONT_OFFICE_PORTFOLIO_IDS.find((candidate) =>
      portfolioIds.includes(candidate)
    ) ??
    portfolioIds[0] ??
    null
  );
}
