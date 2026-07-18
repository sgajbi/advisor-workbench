const CANONICAL_ADVISOR_BOOK_AS_OF_DATE = "2026-04-10";
const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function resolveAdvisorBookAsOfDate(requested?: string | null): string {
  const candidate =
    requested?.trim() ||
    process.env.NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE?.trim() ||
    CANONICAL_ADVISOR_BOOK_AS_OF_DATE;

  return BUSINESS_DATE_PATTERN.test(candidate)
    ? candidate
    : CANONICAL_ADVISOR_BOOK_AS_OF_DATE;
}
