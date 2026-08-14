export const CANONICAL_PERFORMANCE_PERIOD_OPTIONS = [
  "MTD",
  "QTD",
  "YTD",
  "1Y",
  "3Y",
  "5Y",
] as const;

export const CANONICAL_PERFORMANCE_PERIODS = [
  ...CANONICAL_PERFORMANCE_PERIOD_OPTIONS,
  "SI",
  "EXPLICIT",
] as const;

export type CanonicalPerformancePeriod = (typeof CANONICAL_PERFORMANCE_PERIODS)[number];

export type PerformancePeriodDefinition = {
  code: CanonicalPerformancePeriod;
  label: string;
  semantics: "calendar_to_date" | "trailing_window" | "since_inception" | "explicit_window";
  startRule:
    | "first_day_of_anchor_month"
    | "first_day_of_anchor_quarter"
    | "first_day_of_anchor_year"
    | "anchor_minus_1_year_plus_1_day"
    | "anchor_minus_3_years_plus_1_day"
    | "anchor_minus_5_years_plus_1_day"
    | "resolved_inception_date"
    | "caller_supplied_start_date";
};

export const PERFORMANCE_PERIOD_DEFINITIONS: Record<
  CanonicalPerformancePeriod,
  PerformancePeriodDefinition
> = {
  MTD: {
    code: "MTD",
    label: "Month to date",
    semantics: "calendar_to_date",
    startRule: "first_day_of_anchor_month",
  },
  QTD: {
    code: "QTD",
    label: "Quarter to date",
    semantics: "calendar_to_date",
    startRule: "first_day_of_anchor_quarter",
  },
  YTD: {
    code: "YTD",
    label: "Year to date",
    semantics: "calendar_to_date",
    startRule: "first_day_of_anchor_year",
  },
  "1Y": {
    code: "1Y",
    label: "Trailing one year",
    semantics: "trailing_window",
    startRule: "anchor_minus_1_year_plus_1_day",
  },
  "3Y": {
    code: "3Y",
    label: "Trailing three years",
    semantics: "trailing_window",
    startRule: "anchor_minus_3_years_plus_1_day",
  },
  "5Y": {
    code: "5Y",
    label: "Trailing five years",
    semantics: "trailing_window",
    startRule: "anchor_minus_5_years_plus_1_day",
  },
  SI: {
    code: "SI",
    label: "Since inception",
    semantics: "since_inception",
    startRule: "resolved_inception_date",
  },
  EXPLICIT: {
    code: "EXPLICIT",
    label: "Explicit range",
    semantics: "explicit_window",
    startRule: "caller_supplied_start_date",
  },
};

export function getPerformancePeriodDefinition(period: CanonicalPerformancePeriod) {
  return PERFORMANCE_PERIOD_DEFINITIONS[period];
}

export function parseCanonicalPerformancePeriod(
  value: unknown
): CanonicalPerformancePeriod | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim().toUpperCase();
  return CANONICAL_PERFORMANCE_PERIODS.find((period) => period === candidate) ?? null;
}
