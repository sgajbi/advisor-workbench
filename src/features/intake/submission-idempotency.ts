import { PortfolioBundlePayload } from "./types";

export type IntakeSubmissionScope =
  | "CREATE_PORTFOLIO"
  | "ADD_POSITIONS"
  | "ADD_TRANSACTIONS"
  | "ADD_INSTRUMENTS"
  | "ADD_MARKET_DATA"
  | "CSV_BUNDLE";

export type IntakeSubmissionAttempt = {
  fingerprint: string;
  idempotencyKey: string;
};

function randomToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function submissionScopeSlug(scope: IntakeSubmissionScope): string {
  return scope.toLowerCase().replaceAll("_", "-");
}

export function createIntakeBundleIdempotencyKey(scope: IntakeSubmissionScope): string {
  return `workbench-intake-bundle-${submissionScopeSlug(scope)}-${randomToken()}`;
}

export function fingerprintIntakeBundlePayload(payload: PortfolioBundlePayload): string {
  return JSON.stringify(payload);
}

export function resolveIntakeSubmissionAttempt(
  currentAttempt: IntakeSubmissionAttempt | null,
  scope: IntakeSubmissionScope,
  fingerprint: string
): IntakeSubmissionAttempt {
  if (currentAttempt?.fingerprint === fingerprint) {
    return currentAttempt;
  }

  return {
    fingerprint,
    idempotencyKey: createIntakeBundleIdempotencyKey(scope),
  };
}
