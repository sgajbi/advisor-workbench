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
