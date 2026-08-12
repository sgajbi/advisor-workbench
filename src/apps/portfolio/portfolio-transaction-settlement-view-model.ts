import type { PortfolioTransactionView } from "./types";

export type PortfolioTransactionSettlementStateKind =
  | "settled"
  | "review_required"
  | "not_reported"
  | "not_applicable";

export type PortfolioTransactionSettlementState = {
  kind: PortfolioTransactionSettlementStateKind;
  label: "Settled" | "Review required" | "Not reported" | "Not applicable";
  tone: "clear" | "warn" | "neutral";
  applicable: boolean;
};

export type PortfolioTransactionSettlementSummary = {
  transactionCount: number;
  applicableCount: number;
  settledCount: number;
  reviewRequiredCount: number;
  notReportedCount: number;
  notApplicableCount: number;
  state: "settled" | "review_required" | "not_reported" | "not_applicable" | "empty";
  status: "Settled" | "Review required" | "Not reported" | "Not applicable" | "Empty";
  detail: string;
  tone: "success" | "warn" | "default";
};

type SettlementStateInput = Pick<
  PortfolioTransactionView,
  "component_type" | "settlement_status"
>;

export function buildPortfolioTransactionSettlementState(
  transaction: SettlementStateInput,
): PortfolioTransactionSettlementState {
  const sourceStatus = normalizeSourceValue(transaction.settlement_status);

  if (sourceStatus === "SETTLED") {
    return {
      kind: "settled",
      label: "Settled",
      tone: "clear",
      applicable: true,
    };
  }

  if (sourceStatus) {
    return {
      kind: "review_required",
      label: "Review required",
      tone: "warn",
      applicable: true,
    };
  }

  if (isCashSettlementComponentType(transaction.component_type)) {
    return {
      kind: "not_reported",
      label: "Not reported",
      tone: "warn",
      applicable: true,
    };
  }

  return {
    kind: "not_applicable",
    label: "Not applicable",
    tone: "neutral",
    applicable: false,
  };
}

export function buildPortfolioTransactionSettlementSummary(
  transactions: SettlementStateInput[],
): PortfolioTransactionSettlementSummary {
  const states = transactions.map(buildPortfolioTransactionSettlementState);
  const transactionCount = states.length;
  const settledCount = countState(states, "settled");
  const reviewRequiredCount = countState(states, "review_required");
  const notReportedCount = countState(states, "not_reported");
  const notApplicableCount = countState(states, "not_applicable");
  const applicableCount = transactionCount - notApplicableCount;
  const counts = {
    transactionCount,
    applicableCount,
    settledCount,
    reviewRequiredCount,
    notReportedCount,
    notApplicableCount,
  };

  if (!transactionCount) {
    return {
      ...counts,
      state: "empty",
      status: "Empty",
      detail: "No transaction settlement lifecycle is available for review",
      tone: "default",
    };
  }

  if (!applicableCount) {
    return {
      ...counts,
      state: "not_applicable",
      status: "Not applicable",
      detail: `${formatCount(notApplicableCount, "ledger entry", "ledger entries")} outside the settlement lifecycle`,
      tone: "default",
    };
  }

  if (reviewRequiredCount) {
    return {
      ...counts,
      state: "review_required",
      status: "Review required",
      detail: formatSettlementSummary(counts),
      tone: "warn",
    };
  }

  if (notReportedCount) {
    return {
      ...counts,
      state: "not_reported",
      status: "Not reported",
      detail: formatSettlementSummary(counts),
      tone: "warn",
    };
  }

  return {
    ...counts,
    state: "settled",
    status: "Settled",
    detail: formatSettlementSummary(counts),
    tone: "success",
  };
}

function normalizeSourceValue(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? "";
}

function isCashSettlementComponentType(value: string | null | undefined): boolean {
  const normalized = normalizeSourceValue(value);
  return (
    normalized === "FX_CASH_SETTLEMENT_BUY" ||
    normalized === "FX_CASH_SETTLEMENT_SELL"
  );
}

function countState(
  states: PortfolioTransactionSettlementState[],
  kind: PortfolioTransactionSettlementStateKind,
): number {
  return states.filter((state) => state.kind === kind).length;
}

function formatSettlementSummary({
  settledCount,
  reviewRequiredCount,
  notReportedCount,
  notApplicableCount,
}: Pick<
  PortfolioTransactionSettlementSummary,
  "settledCount" | "reviewRequiredCount" | "notReportedCount" | "notApplicableCount"
>): string {
  return [
    reviewRequiredCount
      ? `${formatCount(reviewRequiredCount, "settlement status", "settlement statuses")} ${
          reviewRequiredCount === 1 ? "requires" : "require"
        } review`
      : null,
    notReportedCount
      ? `${formatCount(notReportedCount, "settlement status", "settlement statuses")} not reported`
      : null,
    settledCount ? `${formatCount(settledCount, "settlement status", "settlement statuses")} settled` : null,
    notApplicableCount
      ? `${formatCount(notApplicableCount, "ledger entry", "ledger entries")} not applicable`
      : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join("; ");
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
