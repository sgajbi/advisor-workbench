type PerformanceRiskSource = Readonly<{
  portfolio_id: string;
  period: string;
  as_of_date: string;
  benchmark_code?: string | null;
}>;

export type PerformanceRiskSourceIdentity = Readonly<{
  portfolioId: string;
  period: string;
  asOfDate: string;
  benchmark?: string;
}>;

export function isPerformanceRiskSourceCurrent(
  source: PerformanceRiskSource,
  identity: PerformanceRiskSourceIdentity,
): boolean {
  return (
    source.portfolio_id === identity.portfolioId &&
    source.period === identity.period &&
    source.as_of_date === identity.asOfDate &&
    (identity.benchmark === undefined ||
      source.benchmark_code === identity.benchmark)
  );
}

export function requireCurrentPerformanceRiskSource<
  Source extends PerformanceRiskSource,
>(source: Source, identity: PerformanceRiskSourceIdentity): Source {
  if (!isPerformanceRiskSourceCurrent(source, identity)) {
    throw new TypeError(
      "Risk evidence does not confirm the requested source identity.",
    );
  }
  return source;
}
