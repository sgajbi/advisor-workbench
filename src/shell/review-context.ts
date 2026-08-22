import { isBusinessDateValue } from "@/design-system/utils/financial-formatters";

export const REVIEW_PERIODS = [
  "7D",
  "30D",
  "MTD",
  "QTD",
  "YTD",
  "1Y",
  "3Y",
  "5Y",
  "SI",
  "EXPLICIT",
] as const;

export type ReviewPeriod = (typeof REVIEW_PERIODS)[number];

export type ReviewContext = Readonly<{
  portfolioId?: string;
  asOfDate?: string;
  period?: ReviewPeriod;
  reportingCurrency?: string;
  selectedRecordId?: string;
  batchId?: string;
}>;

export type ReviewContextField = keyof ReviewContext;
export type ReviewContextIssueCode = "ambiguous" | "invalid";

export type ReviewContextIssue = Readonly<{
  field: ReviewContextField;
  code: ReviewContextIssueCode;
}>;

export type ReviewContextParseResult =
  | Readonly<{
      status: "valid";
      context: ReviewContext;
    }>
  | Readonly<{
      status: "invalid";
      issues: readonly ReviewContextIssue[];
    }>;

export type ReviewContextSearchParams =
  | Pick<URLSearchParams, "getAll">
  | Readonly<Record<string, string | readonly string[] | undefined>>;

const REVIEW_CONTEXT_QUERY_KEYS = {
  portfolioId: "portfolioId",
  asOfDate: "asOfDate",
  period: "period",
  reportingCurrency: "reportingCurrency",
  selectedRecordId: "selectedRecordId",
  batchId: "batchId",
} as const satisfies Record<ReviewContextField, string>;

const REVIEW_CONTEXT_FIELDS = Object.keys(
  REVIEW_CONTEXT_QUERY_KEYS,
) as ReviewContextField[];

const REVIEW_PERIOD_SET = new Set<string>(REVIEW_PERIODS);
const REPORTING_CURRENCY_PATTERN = /^[A-Z]{3}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

/**
 * Parses only the governed cross-workspace context fields. Page-local query
 * parameters are intentionally ignored so each screen can compose its own
 * state without creating a second review-context parser.
 *
 * One malformed or repeated governed field invalidates the complete context.
 * Callers must not salvage a partial portfolio/date identity from an invalid
 * result because that can combine facts from different review states.
 */
export function parseReviewContext(
  searchParams: ReviewContextSearchParams,
): ReviewContextParseResult {
  const context: Record<string, string> = {};
  const issues: ReviewContextIssue[] = [];

  for (const field of REVIEW_CONTEXT_FIELDS) {
    const values = getSearchParamValues(
      searchParams,
      REVIEW_CONTEXT_QUERY_KEYS[field],
    );
    if (values.length === 0) {
      continue;
    }
    if (values.length !== 1) {
      issues.push({ field, code: "ambiguous" });
      continue;
    }

    const value = values[0];
    if (!isValidReviewContextValue(field, value)) {
      issues.push({ field, code: "invalid" });
      continue;
    }
    context[field] = value;
  }

  return issues.length > 0
    ? { status: "invalid", issues }
    : { status: "valid", context: context as ReviewContext };
}

/**
 * Emits governed fields once and in a stable order. Invalid programmatic
 * context is rejected instead of being converted into a misleading URL.
 */
export function serializeReviewContext(context: ReviewContext): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const field of REVIEW_CONTEXT_FIELDS) {
    const value = context[field];
    if (value === undefined) {
      continue;
    }
    if (!isValidReviewContextValue(field, value)) {
      throw new TypeError(`Invalid review-context value for ${field}.`);
    }
    searchParams.append(REVIEW_CONTEXT_QUERY_KEYS[field], value);
  }

  return searchParams;
}

function getSearchParamValues(
  searchParams: ReviewContextSearchParams,
  key: string,
): readonly string[] {
  const getAll = (searchParams as { getAll?: unknown }).getAll;
  if (typeof getAll === "function") {
    return (getAll as (name: string) => string[]).call(searchParams, key);
  }

  const record = searchParams as Readonly<
    Record<string, string | readonly string[] | undefined>
  >;
  const value = record[key];
  if (value === undefined) {
    return [];
  }
  return typeof value === "string" ? [value] : value;
}

function isValidReviewContextValue(
  field: ReviewContextField,
  value: string,
): boolean {
  switch (field) {
    case "portfolioId":
      return isBoundedSourceIdentity(value, 128);
    case "asOfDate":
      return isBusinessDateValue(value);
    case "period":
      return REVIEW_PERIOD_SET.has(value);
    case "reportingCurrency":
      return REPORTING_CURRENCY_PATTERN.test(value);
    case "selectedRecordId":
      return isBoundedSourceIdentity(value, 256);
    case "batchId":
      return isBoundedSourceIdentity(value, 128);
  }
}

function isBoundedSourceIdentity(value: string, maximumLength: number): boolean {
  return (
    value.length > 0 &&
    value.length <= maximumLength &&
    value === value.trim() &&
    !CONTROL_CHARACTER_PATTERN.test(value)
  );
}
