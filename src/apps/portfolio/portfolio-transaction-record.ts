import type { PortfolioTransactionView } from "./types";

export type PortfolioTransactionRecordResponse = {
  correlation_id: string;
  contract_version: string;
  portfolio_id: string;
  reporting_currency: string | null;
  transaction: PortfolioTransactionView;
  reason_codes: string[];
};

export type PortfolioTransactionRecordFailure =
  | "access_denied"
  | "identity_mismatch"
  | "invalid_request"
  | "not_found"
  | "source_contract_invalid"
  | "source_unavailable"
  | "unavailable";

export class PortfolioTransactionRecordError extends Error {
  constructor(readonly failure: PortfolioTransactionRecordFailure) {
    super(`Transaction record ${failure}`);
    this.name = "PortfolioTransactionRecordError";
  }
}

export function parsePortfolioTransactionRecord(
  value: unknown,
  expected: { portfolioId: string; transactionId: string },
): PortfolioTransactionRecordResponse {
  if (!isRecord(value) || !isRecord(value.transaction)) {
    throw new PortfolioTransactionRecordError("source_contract_invalid");
  }
  const transaction = value.transaction;
  if (
    !isNonEmptyString(value.correlation_id) ||
    !isNonEmptyString(value.contract_version) ||
    !isNonEmptyString(value.portfolio_id) ||
    !(
      value.reporting_currency === null ||
      isNonEmptyString(value.reporting_currency)
    ) ||
    !isStringArray(value.reason_codes) ||
    !isTransaction(transaction)
  ) {
    throw new PortfolioTransactionRecordError("source_contract_invalid");
  }
  if (
    value.portfolio_id !== expected.portfolioId ||
    transaction.transaction_id !== expected.transactionId
  ) {
    throw new PortfolioTransactionRecordError("identity_mismatch");
  }
  return value as PortfolioTransactionRecordResponse;
}

function isTransaction(value: Record<string, unknown>): boolean {
  return (
    isNonEmptyString(value.transaction_id) &&
    isNonEmptyString(value.transaction_date) &&
    isNonEmptyString(value.transaction_type) &&
    isNonEmptyString(value.security_id) &&
    isNonEmptyString(value.instrument_id) &&
    isFiniteNumber(value.quantity) &&
    nullableFiniteNumbersAreValid(value, [
      "price",
      "gross_amount",
      "net_cost_base",
      "realized_gain_loss_base",
    ]) &&
    nullableStringsAreValid(value, [
      "settlement_date",
      "component_type",
      "currency",
      "settlement_status",
      "source_system",
      "cash_entry_mode",
      "economic_event_id",
      "linked_transaction_group_id",
      "fx_contract_id",
      "swap_event_id",
      "near_leg_group_id",
      "far_leg_group_id",
    ])
  );
}

function nullableFiniteNumbersAreValid(
  value: Record<string, unknown>,
  fields: string[],
): boolean {
  return fields.every(
    (field) =>
      value[field] === undefined ||
      value[field] === null ||
      isFiniteNumber(value[field]),
  );
}

function nullableStringsAreValid(
  value: Record<string, unknown>,
  fields: string[],
): boolean {
  return fields.every(
    (field) =>
      value[field] === undefined ||
      value[field] === null ||
      typeof value[field] === "string",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}
