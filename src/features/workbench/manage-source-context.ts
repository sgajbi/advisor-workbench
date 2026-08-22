import { formatBusinessDateValue } from "@/design-system/utils/financial-formatters";
import type { WorkspaceReviewContext } from "@/shell/review-context";

export type ManageSourceContextNotice = Readonly<{
  title: string;
  body: string;
}>;

export function buildManageSourceContextNotice({
  reviewContext,
  sourceAsOfDate,
  sourceCurrency,
}: {
  reviewContext: WorkspaceReviewContext;
  sourceAsOfDate: string;
  sourceCurrency: string;
}): ManageSourceContextNotice | null {
  const limitations: string[] = [];

  if (
    reviewContext.asOfDate &&
    reviewContext.asOfDate !== sourceAsOfDate
  ) {
    limitations.push(
      `Mandate management uses the source valuation date ${formatBusinessDateValue(sourceAsOfDate)}; the advisor review date ${formatBusinessDateValue(reviewContext.asOfDate)} remains available when you return to other workspaces.`,
    );
  }

  if (
    reviewContext.reportingCurrency &&
    reviewContext.reportingCurrency !== sourceCurrency
  ) {
    limitations.push(
      `Mandate management is presented in source base currency ${sourceCurrency}; reporting-currency restatement to ${reviewContext.reportingCurrency} is not supported by this contract.`,
    );
  }

  return limitations.length > 0
    ? {
        title: "Mandate source context",
        body: limitations.join(" "),
      }
    : null;
}
