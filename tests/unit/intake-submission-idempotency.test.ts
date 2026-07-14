import { describe, expect, it } from "vitest";

import {
  fingerprintIntakeBundlePayload,
  resolveIntakeSubmissionAttempt,
} from "../../src/features/intake/submission-idempotency";
import { PortfolioBundlePayload } from "../../src/features/intake/types";

const payload: PortfolioBundlePayload = {
  sourceSystem: "ADVISOR_WORKBENCH_UI",
  mode: "UPSERT",
  businessDates: [{ businessDate: "2026-01-02" }],
  portfolios: [],
  instruments: [],
  transactions: [],
  marketPrices: [],
  fxRates: [],
};

describe("intake submission idempotency", () => {
  it("reuses the current key when retrying the same bundle payload", () => {
    const fingerprint = fingerprintIntakeBundlePayload(payload);
    const firstAttempt = resolveIntakeSubmissionAttempt(null, "CREATE_PORTFOLIO", fingerprint);
    const retryAttempt = resolveIntakeSubmissionAttempt(firstAttempt, "CREATE_PORTFOLIO", fingerprint);

    expect(retryAttempt).toEqual(firstAttempt);
    expect(firstAttempt.idempotencyKey).toMatch(/^workbench-intake-bundle-create-portfolio-/);
  });

  it("creates a new key when the submitted bundle changes", () => {
    const firstAttempt = resolveIntakeSubmissionAttempt(
      null,
      "ADD_TRANSACTIONS",
      fingerprintIntakeBundlePayload(payload)
    );
    const changedPayload = {
      ...payload,
      businessDates: [{ businessDate: "2026-01-03" }],
    };
    const changedAttempt = resolveIntakeSubmissionAttempt(
      firstAttempt,
      "ADD_TRANSACTIONS",
      fingerprintIntakeBundlePayload(changedPayload)
    );

    expect(changedAttempt.fingerprint).not.toBe(firstAttempt.fingerprint);
    expect(changedAttempt.idempotencyKey).not.toBe(firstAttempt.idempotencyKey);
    expect(changedAttempt.idempotencyKey).toMatch(/^workbench-intake-bundle-add-transactions-/);
  });
});
