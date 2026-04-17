import type { PortfolioTransactionDrilldownFilter, PortfolioTransactionView } from "../types";

export function buildTransactionFilterOptions(
  transactions: PortfolioTransactionView[],
  pickValue: (transaction: PortfolioTransactionView) => string | null | undefined
): string[] {
  return ["ALL", ...new Set(transactions.map(pickValue).filter(isNonEmptyString))];
}

export function shouldReuseInitialTransactions(params: {
  externalFilter: PortfolioTransactionDrilldownFilter | null | undefined;
  transactionType: string;
  componentType: string;
  startDate: string;
  endDate: string;
  defaultStartDate: string;
  defaultEndDate: string;
  initialTransactionCount: number;
}): boolean {
  return (
    params.externalFilter?.kind !== "security" &&
    params.transactionType === "ALL" &&
    params.componentType === "ALL" &&
    params.startDate === params.defaultStartDate &&
    params.endDate === params.defaultEndDate &&
    params.initialTransactionCount > 0
  );
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}
