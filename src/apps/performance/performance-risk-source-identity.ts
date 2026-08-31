type PerformanceRiskSource = Readonly<{
  portfolio_id: string;
  period: string;
  as_of_date: string;
  benchmark_code?: string | null;
  state?: string;
  payload?: unknown;
}>;

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
}>;

export function isPerformanceRiskSourceCurrent(
  source: PerformanceRiskSource,
  identity: PerformanceRiskSourceIdentity,
): boolean {
  return (
    source.portfolio_id === identity.portfolioId &&
    source.period === identity.period &&
    source.as_of_date === identity.asOfDate &&
    (source.benchmark_code ?? null) === identity.benchmark &&
    hasRequestedRiskWindow(source, identity) &&
    hasRequestedRiskAttribution(source, identity) &&
    hasRequestedRiskDetail(source, identity)
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
    return (
      payload == null &&
      (source.state === "unavailable" || source.state === "blocked")
    );
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
  if (!identity.reportStartDate && !identity.reportEndDate) {
    const periods = readRiskPeriods(source.payload);
    return periods?.every((period) => period.end_date === identity.asOfDate) ?? true;
  }

  const periods = readRiskPeriods(source.payload);
  return Boolean(
    periods?.length &&
      periods.every(
        (period) =>
          (!identity.reportStartDate || period.start_date === identity.reportStartDate) &&
          (!identity.reportEndDate || period.end_date === identity.reportEndDate),
      ),
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
): ReadonlyArray<Readonly<{ start_date: string; end_date: string }>> | null {
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
