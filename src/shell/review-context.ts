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
  | Readonly<Record<string, string | readonly string[] | undefined>>
  | null
  | undefined;

export type WorkspaceReviewContext = Pick<
  ReviewContext,
  "portfolioId" | "asOfDate" | "period" | "reportingCurrency"
>;

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
const REPORTING_CURRENCY_PATTERN = /^[A-Z]{3}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export function isValidReviewContextRecordId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    isBoundedSourceIdentity(value, 256)
  );
}

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

export function isReviewPeriod(value: string): value is ReviewPeriod {
  return REVIEW_PERIODS.some((period) => period === value);
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

/**
 * Projects the durable review identity that may cross workspace boundaries.
 * Record and batch identities are deliberately screen-local and must be
 * reselected or source-rehydrated by their owning workspace.
 */
export function scopeReviewContextForWorkspace(
  context: ReviewContext,
  policy?: Readonly<{ acceptedPeriods?: readonly ReviewPeriod[] }>,
): WorkspaceReviewContext {
  const {
    portfolioId,
    asOfDate,
    period,
    reportingCurrency,
  } = context;
  const destinationAcceptsPeriod =
    !period ||
    !policy?.acceptedPeriods ||
    policy.acceptedPeriods.includes(period);
  return {
    ...(portfolioId ? { portfolioId } : {}),
    ...(asOfDate ? { asOfDate } : {}),
    ...(period && destinationAcceptsPeriod ? { period } : {}),
    ...(reportingCurrency ? { reportingCurrency } : {}),
  };
}

/**
 * Composes a local Workbench destination with one authoritative review
 * context. Any stale governed fields already present in the destination are
 * removed before the supplied context is written; page-local parameters and
 * fragments retain their order and multiplicity.
 */
export function buildReviewContextHref(
  href: string,
  context: ReviewContext,
): string {
  const { pathname, search, hash } = splitLocalHref(href);
  const localSearchParams = new URLSearchParams(search);

  for (const field of REVIEW_CONTEXT_FIELDS) {
    localSearchParams.delete(REVIEW_CONTEXT_QUERY_KEYS[field]);
  }

  const combinedSearchParams = serializeReviewContext(context);
  for (const [key, value] of localSearchParams) {
    combinedSearchParams.append(key, value);
  }

  const query = combinedSearchParams.toString();
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

/**
 * Applies a bounded review-context change to the current local address. The
 * complete current context must be valid before any field is changed; an
 * explicit `undefined` removes a governed field while page-local state stays
 * intact.
 */
export function buildReviewContextNavigationHref({
  pathname,
  searchParams,
  patch,
}: {
  pathname: string;
  searchParams: ReviewContextSearchParams & { toString(): string };
  patch: Partial<ReviewContext>;
}): string | null {
  const reviewContextResult = parseReviewContext(searchParams);
  if (reviewContextResult.status === "invalid") {
    return null;
  }

  const currentQuery = searchParams.toString();
  const currentHref = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
  return buildReviewContextHref(currentHref, {
    ...reviewContextResult.context,
    ...patch,
  });
}

function getSearchParamValues(
  searchParams: ReviewContextSearchParams,
  key: string,
): readonly string[] {
  if (!searchParams) {
    return [];
  }

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
      return isReviewPeriod(value);
    case "reportingCurrency":
      return REPORTING_CURRENCY_PATTERN.test(value);
    case "selectedRecordId":
      return isValidReviewContextRecordId(value);
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

function splitLocalHref(href: string): {
  pathname: string;
  search: string;
  hash: string;
} {
  if (!href.startsWith("/") || href.startsWith("//")) {
    throw new TypeError("Review-context destinations must be local absolute paths.");
  }

  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const pathAndSearch = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = pathAndSearch.indexOf("?");
  const pathname = queryIndex >= 0 ? pathAndSearch.slice(0, queryIndex) : pathAndSearch;
  const search = queryIndex >= 0 ? pathAndSearch.slice(queryIndex + 1) : "";

  return { pathname, search, hash };
}
