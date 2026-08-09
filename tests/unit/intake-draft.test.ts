import { describe, expect, it, vi } from "vitest";

import {
  buildIntakeReviewProjection,
  createBlankIntakeDraft,
  createIntakeRowId,
  intakeDraftFingerprint,
  validateIntakeDraft,
  type PositionsDraft,
} from "../../src/features/intake/draft";

describe("intake draft", () => {
  it.each([
    "CREATE_PORTFOLIO",
    "ADD_POSITIONS",
    "ADD_TRANSACTIONS",
    "ADD_INSTRUMENTS",
    "ADD_MARKET_DATA",
    "IMPORT_FILE",
  ] as const)("creates %s without production-looking defaults", (task) => {
    const draft = createBlankIntakeDraft(task);

    expect(JSON.stringify(draft)).not.toMatch(/PORT_UI|CIF_UI|advisor_1|AAPL|Apple Inc|2026-01-0[23]/);
    expect(validateIntakeDraft(draft).length).toBeGreaterThan(0);
  });

  it("creates stable, distinct client row identities", () => {
    expect(createIntakeRowId()).not.toBe(createIntakeRowId());
  });

  it("reports every unresolved field in an opening-position request", () => {
    const draft = createBlankIntakeDraft("ADD_POSITIONS") as PositionsDraft;

    expect(validateIntakeDraft(draft).map((issue) => issue.field)).toEqual([
      "portfolioId",
      "baseCurrency",
      `rows.${draft.rows[0].rowId}.securityId`,
      `rows.${draft.rows[0].rowId}.instrumentName`,
      `rows.${draft.rows[0].rowId}.isin`,
      `rows.${draft.rows[0].rowId}.productType`,
      `rows.${draft.rows[0].rowId}.quantity`,
      `rows.${draft.rows[0].rowId}.price`,
      `rows.${draft.rows[0].rowId}.effectiveDate`,
      `rows.${draft.rows[0].rowId}.transactionType`,
    ]);
  });

  it("builds a stable review projection only after validation succeeds", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const draft = createBlankIntakeDraft("ADD_POSITIONS") as PositionsDraft;
    draft.portfolioId = "PORT_001";
    draft.baseCurrency = "USD";
    draft.rows[0].value = {
      securityId: "SEC_001",
      instrumentName: "Global Equity Fund",
      isin: "US0000000001",
      productType: "Fund",
      quantity: 12,
      price: 104.25,
      effectiveDate: "2026-08-08",
      transactionType: "BUY",
    };

    expect(validateIntakeDraft(draft)).toEqual([]);
    const projection = buildIntakeReviewProjection(draft);

    expect(projection.facts).toEqual(
      expect.arrayContaining([
        { label: "Portfolio", value: "PORT_001" },
        { label: "Position rows", value: "1" },
      ]),
    );
    expect(projection.payload.transactions[0]).toEqual(
      expect.objectContaining({
        transaction_id: "TRN_PORT_001_SEC_001_1000_1",
        quantity: 12,
        price: 104.25,
      }),
    );
  });

  it("rejects review while concrete validation issues remain", () => {
    expect(() => buildIntakeReviewProjection(createBlankIntakeDraft("CREATE_PORTFOLIO"))).toThrow(
      "unresolved validation issues",
    );
  });

  it("changes the review fingerprint whenever material draft data changes", () => {
    const draft = createBlankIntakeDraft("CREATE_PORTFOLIO");
    if (draft.task !== "CREATE_PORTFOLIO") throw new Error("Unexpected draft");
    const first = intakeDraftFingerprint(draft);
    draft.input.portfolioId = "PORT_001";

    expect(intakeDraftFingerprint(draft)).not.toBe(first);
  });

  it("keeps an imported file in review rather than publishing during parse", () => {
    const draft = createBlankIntakeDraft("IMPORT_FILE");
    if (draft.task !== "IMPORT_FILE") throw new Error("Unexpected draft");
    draft.fileName = "portfolio-bundle.csv";
    draft.payload = {
      sourceSystem: "OPERATIONS_FILE_IMPORT",
      mode: "UPSERT",
      businessDates: [{ businessDate: "2026-08-08" }],
      portfolios: [],
      instruments: [],
      transactions: [],
      marketPrices: [],
      fxRates: [],
    };

    expect(validateIntakeDraft(draft)).toEqual([]);
    expect(buildIntakeReviewProjection(draft)).toEqual(
      expect.objectContaining({
        task: "IMPORT_FILE",
        facts: expect.arrayContaining([{ label: "File", value: "portfolio-bundle.csv" }]),
      }),
    );
  });
});
