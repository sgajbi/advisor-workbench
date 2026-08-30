import type { ReviewContextSearchParams } from "@/shell/review-context";

export type ProposalSourceWindowContext = Readonly<{
  cursor?: string;
  windowNumber: number;
}>;

export type ProposalSourceWindowParseResult =
  | Readonly<{
      status: "valid";
      context: ProposalSourceWindowContext;
    }>
  | Readonly<{ status: "invalid" }>;

const CURSOR_QUERY_KEY = "cursor";
const WINDOW_QUERY_KEY = "sourceWindow";
const MAXIMUM_CURSOR_LENGTH = 2_048;
const MAXIMUM_WINDOW_NUMBER = 100_000;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

/**
 * Parses the proposal screen's page-local source window address.
 *
 * Cursor values remain opaque source tokens. Workbench validates only their
 * transport shape and never interprets them as business or ordering truth.
 */
export function parseProposalSourceWindowContext(
  searchParams: ReviewContextSearchParams,
): ProposalSourceWindowParseResult {
  const cursorValues = getSearchParamValues(searchParams, CURSOR_QUERY_KEY);
  const windowValues = getSearchParamValues(searchParams, WINDOW_QUERY_KEY);

  if (cursorValues.length === 0 && windowValues.length === 0) {
    return { status: "valid", context: { windowNumber: 1 } };
  }
  if (cursorValues.length !== 1 || windowValues.length !== 1) {
    return { status: "invalid" };
  }

  const cursor = cursorValues[0];
  const windowNumber = Number(windowValues[0]);
  if (
    !isValidCursor(cursor) ||
    !Number.isSafeInteger(windowNumber) ||
    windowNumber < 1 ||
    windowNumber > MAXIMUM_WINDOW_NUMBER ||
    String(windowNumber) !== windowValues[0]
  ) {
    return { status: "invalid" };
  }

  return { status: "valid", context: { cursor, windowNumber } };
}

/**
 * Adds or removes page-local source-window state without altering governed
 * review context or unrelated route controls.
 */
export function buildProposalSourceWindowHref(
  href: string,
  context: ProposalSourceWindowContext,
): string {
  if (!href.startsWith("/") || href.startsWith("//")) {
    throw new TypeError("Proposal source-window destinations must be local.");
  }
  if (
    (context.cursor === undefined && context.windowNumber !== 1) ||
    (context.cursor !== undefined && !isValidCursor(context.cursor)) ||
    !Number.isSafeInteger(context.windowNumber) ||
    context.windowNumber < 1 ||
    context.windowNumber > MAXIMUM_WINDOW_NUMBER
  ) {
    throw new TypeError("Invalid proposal source-window context.");
  }

  const url = new URL(href, "https://lotus-workbench.local");
  url.searchParams.delete(CURSOR_QUERY_KEY);
  url.searchParams.delete(WINDOW_QUERY_KEY);
  if (context.cursor !== undefined) {
    url.searchParams.append(CURSOR_QUERY_KEY, context.cursor);
    url.searchParams.append(WINDOW_QUERY_KEY, String(context.windowNumber));
  }
  return `${url.pathname}${url.search}${url.hash}`;
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

  const value = (
    searchParams as Readonly<
      Record<string, string | readonly string[] | undefined>
    >
  )[key];
  if (value === undefined) {
    return [];
  }
  return typeof value === "string" ? [value] : value;
}

function isValidCursor(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAXIMUM_CURSOR_LENGTH &&
    value === value.trim() &&
    !CONTROL_CHARACTER_PATTERN.test(value)
  );
}
