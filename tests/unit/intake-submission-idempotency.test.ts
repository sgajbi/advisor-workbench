import { describe, expect, it } from "vitest";

import {
  fingerprintIntakeBundlePayload,
  fingerprintIntakeSubmissionIntent,
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

  it("fingerprints submission intent separately from generated gateway payload identifiers", () => {
    const firstPayloadFingerprint = fingerprintIntakeBundlePayload({
      ...payload,
      transactions: [
        {
          transaction_id: "TRN_PORT_A_SEC_A_1000_1",
          portfolio_id: "PORT_A",
          instrument_id: "SEC_A",
          security_id: "SEC_A",
          transaction_date: "2026-01-02",
          transaction_type: "BUY",
          quantity: 1,
          price: 100,
          gross_transaction_amount: 100,
          trade_currency: "USD",
          currency: "USD",
        },
      ],
    });
    const retryPayloadFingerprint = fingerprintIntakeBundlePayload({
      ...payload,
      transactions: [
        {
          transaction_id: "TRN_PORT_A_SEC_A_2000_1",
          portfolio_id: "PORT_A",
          instrument_id: "SEC_A",
          security_id: "SEC_A",
          transaction_date: "2026-01-02",
          transaction_type: "BUY",
          quantity: 1,
          price: 100,
          gross_transaction_amount: 100,
          trade_currency: "USD",
          currency: "USD",
        },
      ],
    });
    const intentFingerprint = fingerprintIntakeSubmissionIntent("ADD_TRANSACTIONS", {
      baseCurrency: "USD",
      portfolioId: "PORT_A",
      transactions: [
        {
          portfolioId: "PORT_A",
          baseCurrency: "USD",
          securityId: "SEC_A",
          quantity: 1,
          price: 100,
          transactionDate: "2026-01-02",
          transactionType: "BUY",
        },
      ],
    });

    expect(retryPayloadFingerprint).not.toBe(firstPayloadFingerprint);
    expect(
      fingerprintIntakeSubmissionIntent("ADD_TRANSACTIONS", {
        baseCurrency: "USD",
        portfolioId: "PORT_A",
        transactions: [
          {
            portfolioId: "PORT_A",
            baseCurrency: "USD",
            securityId: "SEC_A",
            quantity: 1,
            price: 100,
            transactionDate: "2026-01-02",
            transactionType: "BUY",
          },
        ],
      })
    ).toBe(intentFingerprint);
  });
});
