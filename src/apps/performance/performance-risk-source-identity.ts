type PerformanceRiskSource = Readonly<{
  portfolio_id: string;
  period: string;
  as_of_date: string;
  benchmark_code?: string | null;
  state?: string;
  payload?: unknown;
}>;

type RiskPeriod = Readonly<
  { start_date: string; end_date: string } & Record<string, unknown>
>;

export type PerformanceRiskSourceIdentity = Readonly<{
  portfolioId: string;
  period: string;
  asOfDate: string;
  benchmark: string | null;
  reportStartDate?: string;
  reportEndDate?: string;
  attributionType?: string;
  groupingDimension?: string;
  includeUnderwaterSeries?: boolean;
  includeTimeSeries?: boolean;
  windowEvidence?: "periods" | "point_in_time";
}>;

export function isPerformanceRiskSourceCurrent(
  source: PerformanceRiskSource,
  identity: PerformanceRiskSourceIdentity,
): boolean {
  const sourceIdentityMatches =
    source.portfolio_id === identity.portfolioId &&
    source.period === identity.period &&
    source.as_of_date === identity.asOfDate &&
    (source.benchmark_code ?? null) === identity.benchmark;
  if (!sourceIdentityMatches) {
    return false;
  }
  if (isSourceDeclaredFailureWithoutResults(source)) {
    return true;
  }
  return (
    hasRequestedRiskWindow(source, identity) &&
    hasRequestedRiskAttribution(source, identity) &&
    hasRequestedRiskDetail(source, identity)
  );
}

function isSourceDeclaredFailureWithoutResults(
  source: PerformanceRiskSource,
): boolean {
  const periods = readRiskPeriods(source.payload);
  return (
    (source.state === "unavailable" || source.state === "blocked") &&
    (source.payload == null || periods?.length === 0)
  );
}

function hasRequestedRiskDetail(
  source: PerformanceRiskSource,
  identity: PerformanceRiskSourceIdentity,
): boolean {
  if (
    identity.includeUnderwaterSeries === undefined &&
    identity.includeTimeSeries === undefined
  ) {
    return true;
  }
  const payload = source.payload;
  if (!payload || typeof payload !== "object") {
    return false;
  }
  return (
    hasRequestedBoolean(
      payload,
      "analysis_context",
      "include_underwater_series",
      identity.includeUnderwaterSeries,
    ) &&
    hasRequestedBoolean(
      payload,
      "request_context",
      "include_time_series",
      identity.includeTimeSeries,
    )
  );
}

function hasRequestedBoolean(
  payload: object,
  contextKey: string,
  valueKey: string,
  requested: boolean | undefined,
): boolean {
  if (requested === undefined) {
    return true;
  }
  if (!(contextKey in payload)) {
    return false;
  }
  const context = payload[contextKey as keyof typeof payload];
  return Boolean(
    context &&
      typeof context === "object" &&
      valueKey in context &&
      context[valueKey as keyof typeof context] === requested,
  );
}

function hasRequestedRiskWindow(
  source: PerformanceRiskSource,
  identity: PerformanceRiskSourceIdentity,
): boolean {
  if (identity.windowEvidence === "point_in_time") {
    return hasMatchingPointInTimeExecutionContext(source.payload, identity);
  }
  if (!identity.reportStartDate && !identity.reportEndDate) {
    const periods = readRiskPeriods(source.payload);
    return Boolean(
      periods?.length &&
        periods.every(
        (period) =>
          period.end_date === identity.asOfDate &&
          hasRiskSeriesWithinPeriod(period),
        ),
    );
  }

  const periods = readRiskPeriods(source.payload);
  return Boolean(
    periods?.length &&
      periods.every(
        (period) =>
          (!identity.reportStartDate || period.start_date === identity.reportStartDate) &&
          (!identity.reportEndDate || period.end_date === identity.reportEndDate) &&
          hasRiskSeriesWithinPeriod(period),
      ),
  );
}

function hasRiskSeriesWithinPeriod(
  period: RiskPeriod,
): boolean {
  return (
    hasDatedSeriesWithinPeriod(period.underwater_series, period) &&
    hasRollingSeriesWithinPeriod(period.window_results, period)
  );
}

function hasDatedSeriesWithinPeriod(
  series: unknown,
  period: RiskPeriod,
): boolean {
  if (series == null) {
    return true;
  }
  if (!Array.isArray(series)) {
    return false;
  }
  return series.every(
    (point) =>
      point != null &&
      typeof point === "object" &&
      "date" in point &&
      typeof point.date === "string" &&
      point.date >= period.start_date &&
      point.date <= period.end_date,
  );
}

function hasRollingSeriesWithinPeriod(
  windowResults: unknown,
  period: RiskPeriod,
): boolean {
  if (windowResults == null) {
    return true;
  }
  return (
    Array.isArray(windowResults) &&
    windowResults.every(
      (window) =>
        window != null &&
        typeof window === "object" &&
        hasDatedSeriesWithinPeriod(
          "metric_series" in window ? window.metric_series : null,
          period,
        ),
    )
  );
}

function hasMatchingPointInTimeExecutionContext(
  payload: unknown,
  identity: PerformanceRiskSourceIdentity,
): boolean {
  if (!payload || typeof payload !== "object" || !("execution_context" in payload)) {
    return true;
  }
  const executionContext = payload.execution_context;
  if (!executionContext || typeof executionContext !== "object") {
    return false;
  }
  return (
    (!("as_of_date" in executionContext) ||
      executionContext.as_of_date == null ||
      executionContext.as_of_date === identity.asOfDate) &&
    (!("portfolio_id" in executionContext) ||
      executionContext.portfolio_id == null ||
      executionContext.portfolio_id === identity.portfolioId)
  );
}

function hasRequestedRiskAttribution(
  source: PerformanceRiskSource,
  identity: PerformanceRiskSourceIdentity,
): boolean {
  if (!identity.attributionType && !identity.groupingDimension) {
    return true;
  }
  if (!identity.attributionType || !identity.groupingDimension) {
    return false;
  }

  const payload = source.payload;
  if (!payload || typeof payload !== "object" || !("controls" in payload)) {
    return false;
  }
  const controls = payload.controls;
  if (
    !controls ||
    typeof controls !== "object" ||
    !("selected_attribution_type" in controls) ||
    controls.selected_attribution_type !== identity.attributionType ||
    !("selected_grouping_dimension" in controls) ||
    controls.selected_grouping_dimension !== identity.groupingDimension
  ) {
    return false;
  }

  if (!("periods" in payload) || !Array.isArray(payload.periods)) {
    return false;
  }
  return payload.periods.every(
    (period) =>
      period &&
      typeof period === "object" &&
      "attribution_sets" in period &&
      Array.isArray(period.attribution_sets) &&
      period.attribution_sets.every(
        (set: unknown) =>
          set &&
          typeof set === "object" &&
          "attribution_type" in set &&
          set.attribution_type === identity.attributionType &&
          "grouping_dimension" in set &&
          set.grouping_dimension === identity.groupingDimension,
      ),
  );
}

function readRiskPeriods(
  payload: unknown,
): ReadonlyArray<RiskPeriod> | null {
  if (!payload || typeof payload !== "object" || !("periods" in payload)) {
    return null;
  }
  const periods = payload.periods;
  if (!Array.isArray(periods)) {
    return null;
  }
  return periods.every(
    (period) =>
      period &&
      typeof period === "object" &&
      "start_date" in period &&
      typeof period.start_date === "string" &&
      "end_date" in period &&
      typeof period.end_date === "string",
  )
    ? periods
    : null;
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
