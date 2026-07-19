const DEFAULT_WORKBENCH_FALLBACK_PORTFOLIO_IDS = [
  "PB_SG_GLOBAL_BAL_001",
  "DEMO_DPM_EUR_001",
  "DEMO_INCOME_CHF_001",
  "DEMO_BALANCED_SGD_001",
  "DEMO_REBAL_USD_001",
  "DEMO_ADV_USD_001",
] as const;

export function resolveWorkbenchFallbackPortfolioIds(
  configuredPortfolioIds: string | undefined,
): string[] {
  const source =
    configuredPortfolioIds ?? DEFAULT_WORKBENCH_FALLBACK_PORTFOLIO_IDS.join(",");

  return source
    .split(",")
    .map((portfolioId) => portfolioId.trim())
    .filter((portfolioId) => portfolioId.length > 0);
}
