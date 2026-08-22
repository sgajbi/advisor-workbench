import { cx } from "../utils/cx";
import { formatBusinessDateValue } from "../utils/financial-formatters";
import styles from "./workbench-context-notice.module.css";

export type WorkbenchSourceContextNotice = Readonly<{
  title: string;
  body: string;
}>;

export function buildWorkbenchSourceContextNotice({
  title,
  subject,
  requestedAsOfDate,
  requestedReportingCurrency,
  sourceAsOfDate,
  sourceCurrency,
}: {
  title: string;
  subject: string;
  requestedAsOfDate?: string;
  requestedReportingCurrency?: string;
  sourceAsOfDate?: string;
  sourceCurrency?: string;
}): WorkbenchSourceContextNotice | null {
  const limitations: string[] = [];

  if (
    requestedAsOfDate &&
    sourceAsOfDate &&
    requestedAsOfDate !== sourceAsOfDate
  ) {
    limitations.push(
      `${subject} uses the source valuation date ${formatBusinessDateValue(sourceAsOfDate)}; the advisor review date ${formatBusinessDateValue(requestedAsOfDate)} remains available when you return to other workspaces.`,
    );
  }

  if (
    requestedReportingCurrency &&
    sourceCurrency &&
    requestedReportingCurrency !== sourceCurrency
  ) {
    limitations.push(
      `${subject} is presented in source base currency ${sourceCurrency}; reporting-currency restatement to ${requestedReportingCurrency} is not supported by this contract.`,
    );
  }

  return limitations.length > 0
    ? { title, body: limitations.join(" ") }
    : null;
}

export function buildWorkbenchUnsupportedReviewContextNotice({
  title,
  subject,
  destination,
  requestedAsOfDate,
  requestedPeriod,
  requestedReportingCurrency,
}: {
  title: string;
  subject: string;
  destination: string;
  requestedAsOfDate?: string;
  requestedPeriod?: string;
  requestedReportingCurrency?: string;
}): WorkbenchSourceContextNotice | null {
  const selectors = [
    requestedAsOfDate
      ? `advisor review date ${formatBusinessDateValue(requestedAsOfDate)}`
      : null,
    requestedPeriod ? `review period ${requestedPeriod}` : null,
    requestedReportingCurrency
      ? `reporting currency ${requestedReportingCurrency}`
      : null,
  ].filter((selector): selector is string => Boolean(selector));

  if (selectors.length === 0) {
    return null;
  }

  return {
    title,
    body: `${subject} reflects current source state. The carried ${formatBusinessList(selectors)} ${selectors.length === 1 ? "remains" : "remain"} available across the wider review, but ${selectors.length === 1 ? "it does" : "they do"} not filter this ${destination}.`,
  };
}

function formatBusinessList(items: readonly string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

/**
 * A compact, non-blocking explanation of how a source interprets carried
 * business context. Use it when a workspace remains usable but does not
 * support every control owned by the wider advisor review.
 */
export default function WorkbenchContextNotice({
  eyebrow = "Source scope",
  title,
  body,
  className,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <aside
      className={cx(styles.root, className)}
      aria-label={title}
      data-testid="workbench-context-notice"
    >
      <p className={styles.eyebrow}>{eyebrow}</p>
      <p className={styles.title}>{title}</p>
      <p className={styles.body}>{body}</p>
    </aside>
  );
}
