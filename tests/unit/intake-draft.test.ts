import { describe, expect, it, vi } from "vitest";

import {
  buildIntakeReviewProjection,
  createBlankIntakeDraft,
  createIntakeRowId,
  intakeDraftFingerprint,
  validateIntakeDraft,
  type PositionsDraft,
} from "../../src/features/intake/draft";
import { normalizeIntakeDraft } from "../../src/features/intake/normalization";

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

  it("rejects calendar-impossible ISO dates instead of accepting JavaScript date normalization", () => {
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
      effectiveDate: "2026-02-31",
      transactionType: "BUY",
    };

    expect(validateIntakeDraft(draft)).toEqual([
      {
        field: `rows.${draft.rows[0].rowId}.effectiveDate`,
        message: "Position 1: enter a valid effective date.",
      },
    ]);
  });

  it("accepts valid leap-day ISO dates", () => {
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
      effectiveDate: "2028-02-29",
      transactionType: "BUY",
    };

    expect(validateIntakeDraft(draft)).toEqual([]);
  });

  it("rejects leap-day dates in non-leap years", () => {
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
      effectiveDate: "2027-02-29",
      transactionType: "BUY",
    };

    expect(validateIntakeDraft(draft)).toEqual([
      {
        field: `rows.${draft.rows[0].rowId}.effectiveDate`,
        message: "Position 1: enter a valid effective date.",
      },
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

  it.each([
    {
      task: "CREATE_PORTFOLIO" as const,
      prepare: () => {
        const draft = createBlankIntakeDraft("CREATE_PORTFOLIO");
        if (draft.task !== "CREATE_PORTFOLIO") throw new Error("Unexpected draft");
        draft.input = {
          portfolioId: " PORT_001 ",
          baseCurrency: " usd ",
          openDate: " 2026-08-08 ",
          riskExposure: " Balanced ",
          investmentTimeHorizon: " Long term ",
          portfolioType: " Discretionary ",
          bookingCenter: " Singapore ",
          cifId: " CIF_001 ",
          advisorId: " ADV_001 ",
          status: " Pending activation ",
        };
        return draft;
      },
      expected: {
        fact: { label: "Portfolio", value: "PORT_001" },
        payloadPath: ["portfolios", 0, "baseCurrency"] as const,
        payloadValue: "USD",
      },
    },
    {
      task: "ADD_POSITIONS" as const,
      prepare: () => {
        const draft = createBlankIntakeDraft("ADD_POSITIONS");
        if (draft.task !== "ADD_POSITIONS") throw new Error("Unexpected draft");
        draft.portfolioId = " PORT_001 ";
        draft.baseCurrency = " usd ";
        draft.rows[0].value = {
          securityId: " SEC_001 ",
          instrumentName: " Global Equity Fund ",
          isin: " us0000000001 ",
          productType: " Fund ",
          quantity: 12,
          price: 104.25,
          effectiveDate: " 2026-08-08 ",
          transactionType: " buy ",
        };
        return draft;
      },
      expected: {
        fact: { label: "Effective date", value: "2026-08-08" },
        payloadPath: ["instruments", 0, "isin"] as const,
        payloadValue: "US0000000001",
      },
    },
    {
      task: "ADD_TRANSACTIONS" as const,
      prepare: () => {
        const draft = createBlankIntakeDraft("ADD_TRANSACTIONS");
        if (draft.task !== "ADD_TRANSACTIONS") throw new Error("Unexpected draft");
        draft.portfolioId = " PORT_001 ";
        draft.baseCurrency = " eur ";
        draft.rows[0].value = {
          securityId: " SEC_001 ",
          quantity: 4,
          price: 99.5,
          transactionDate: " 2026-08-08 ",
          transactionType: " sell ",
        };
        return draft;
      },
      expected: {
        fact: { label: "Trade currency", value: "EUR" },
        payloadPath: ["transactions", 0, "transaction_type"] as const,
        payloadValue: "SELL",
      },
    },
    {
      task: "ADD_INSTRUMENTS" as const,
      prepare: () => {
        const draft = createBlankIntakeDraft("ADD_INSTRUMENTS");
        if (draft.task !== "ADD_INSTRUMENTS") throw new Error("Unexpected draft");
        draft.rows[0].value = {
          securityId: " SEC_001 ",
          name: " Global Equity Fund ",
          isin: " us0000000001 ",
          instrumentCurrency: " gbp ",
          productType: " Fund ",
          assetClass: " Equity ",
        };
        return draft;
      },
      expected: {
        fact: { label: "Currencies", value: "GBP" },
        payloadPath: ["instruments", 0, "securityId"] as const,
        payloadValue: "SEC_001",
      },
    },
    {
      task: "ADD_MARKET_DATA" as const,
      prepare: () => {
        const draft = createBlankIntakeDraft("ADD_MARKET_DATA");
        if (draft.task !== "ADD_MARKET_DATA") throw new Error("Unexpected draft");
        draft.rows[0].value = {
          securityId: " SEC_001 ",
          priceDate: " 2026-08-08 ",
          price: 101.25,
          currency: " chf ",
        };
        return draft;
      },
      expected: {
        fact: { label: "Observation date", value: "2026-08-08" },
        payloadPath: ["marketPrices", 0, "currency"] as const,
        payloadValue: "CHF",
      },
    },
  ])("normalizes $task once for validation, review, and publication", ({ prepare, expected }) => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const draft = prepare();

    expect(validateIntakeDraft(draft)).toEqual([]);
    const projection = buildIntakeReviewProjection(draft);

    expect(projection.facts).toContainEqual(expected.fact);
    expect(readPath(projection.payload, expected.payloadPath)).toBe(expected.payloadValue);
  });

  it("normalizes imported portfolio, instrument, transaction, price, and business-date evidence without mutating the draft", () => {
    const draft = createBlankIntakeDraft("IMPORT_FILE");
    if (draft.task !== "IMPORT_FILE") throw new Error("Unexpected draft");
    draft.fileName = " portfolio-bundle.csv ";
    draft.payload = {
      sourceSystem: " OPERATIONS_FILE_IMPORT ",
      mode: "UPSERT",
      businessDates: [{ businessDate: " 2026-08-08 " }],
      portfolios: [{
        portfolioId: " PORT_001 ",
        baseCurrency: " usd ",
        openDate: " 2026-08-08 ",
        riskExposure: " Balanced ",
        investmentTimeHorizon: " Long term ",
        portfolioType: " Discretionary ",
        bookingCenter: " Singapore ",
        cifId: " CIF_001 ",
        advisorId: " ADV_001 ",
        status: " Pending activation ",
      }],
      instruments: [{
        securityId: " SEC_001 ",
        name: " Global Equity Fund ",
        isin: " us0000000001 ",
        instrumentCurrency: " usd ",
        productType: " Fund ",
        assetClass: " Equity ",
      }],
      transactions: [{
        transaction_id: " TRN_001 ",
        portfolio_id: " PORT_001 ",
        instrument_id: " SEC_001 ",
        security_id: " SEC_001 ",
        transaction_date: " 2026-08-08T00:00:00Z ",
        transaction_type: " buy ",
        quantity: 10,
        price: 100,
        gross_transaction_amount: 1_000,
        trade_currency: " usd ",
        currency: " usd ",
      }],
      marketPrices: [{
        securityId: " SEC_001 ",
        priceDate: " 2026-08-08 ",
        price: 100,
        currency: " usd ",
      }],
      fxRates: [],
    };
    const rawFingerprint = JSON.stringify(draft);

    expect(validateIntakeDraft(draft)).toEqual([]);
    const normalized = normalizeIntakeDraft(draft);
    const projection = buildIntakeReviewProjection(draft);

    expect(JSON.stringify(draft)).toBe(rawFingerprint);
    expect(intakeDraftFingerprint(draft)).toBe(intakeDraftFingerprint(normalized));
    expect(projection.facts).toContainEqual({ label: "File", value: "portfolio-bundle.csv" });
    expect(projection.payload).toEqual(expect.objectContaining({
      sourceSystem: "OPERATIONS_FILE_IMPORT",
      businessDates: [{ businessDate: "2026-08-08" }],
      portfolios: [expect.objectContaining({ portfolioId: "PORT_001", baseCurrency: "USD" })],
      instruments: [expect.objectContaining({ securityId: "SEC_001", isin: "US0000000001" })],
      transactions: [expect.objectContaining({
        transaction_id: "TRN_001",
        transaction_type: "BUY",
        currency: "USD",
      })],
      marketPrices: [expect.objectContaining({ priceDate: "2026-08-08", currency: "USD" })],
    }));
    const transactionPreview = projection.previewSections?.find(
      ({ title }) => title === "Transaction records",
    );
    const businessDatePreview = projection.previewSections?.find(
      ({ title }) => title === "Business date records",
    );
    expect(transactionPreview?.recordCount).toBe(1);
    expect(transactionPreview?.recordAt(0)).toEqual(
      expect.objectContaining({ title: "Transaction TRN_001" }),
    );
    expect(transactionPreview?.recordAt(1)).toBeNull();
    expect(businessDatePreview?.recordCount).toBe(1);
    expect(businessDatePreview?.recordAt(0)).toEqual({
      title: "Business date 2026-08-08",
      facts: [{ label: "Date", value: "2026-08-08" }],
    });
  });

  it("does not let normalization weaken blank, identifier, date, currency, or positive-number checks", () => {
    const draft = createBlankIntakeDraft("ADD_POSITIONS");
    if (draft.task !== "ADD_POSITIONS") throw new Error("Unexpected draft");
    draft.portfolioId = "   ";
    draft.baseCurrency = " usd-x ";
    draft.rows[0].value = {
      securityId: "   ",
      instrumentName: " Fund ",
      isin: " not-an-isin ",
      productType: " Equity ",
      quantity: Number.NaN,
      price: 0,
      effectiveDate: " 2026-02-31 ",
      transactionType: " buy ",
    };

    expect(validateIntakeDraft(draft).map(({ field }) => field)).toEqual([
      "portfolioId",
      "baseCurrency",
      `rows.${draft.rows[0].rowId}.securityId`,
      `rows.${draft.rows[0].rowId}.isin`,
      `rows.${draft.rows[0].rowId}.quantity`,
      `rows.${draft.rows[0].rowId}.price`,
      `rows.${draft.rows[0].rowId}.effectiveDate`,
    ]);
  });

  it("keeps an imported file in review rather than publishing during parse", () => {
    const draft = createBlankIntakeDraft("IMPORT_FILE");
    if (draft.task !== "IMPORT_FILE") throw new Error("Unexpected draft");
    draft.fileName = "portfolio-bundle.csv";
    draft.payload = {
      sourceSystem: "OPERATIONS_FILE_IMPORT",
      mode: "UPSERT",
      businessDates: [{ businessDate: "2026-08-08" }],
      portfolios: [
        {
          portfolioId: "PORT_001",
          baseCurrency: "USD",
          openDate: "2026-08-08",
          riskExposure: "Balanced",
          investmentTimeHorizon: "Long term",
          portfolioType: "Discretionary",
          bookingCenter: "Singapore",
          cifId: "CIF_001",
          status: "Pending activation",
        },
      ],
      instruments: [
        {
          securityId: "SEC_001",
          name: "Global Equity Fund",
          isin: "US0000000001",
          instrumentCurrency: "USD",
          productType: "Fund",
        },
      ],
      transactions: [
        {
          transaction_id: "TRN_001",
          portfolio_id: "PORT_001",
          instrument_id: "SEC_001",
          security_id: "SEC_001",
          transaction_date: "2026-08-08T00:00:00Z",
          transaction_type: "BUY",
          quantity: 10,
          price: 100,
          gross_transaction_amount: 1_000,
          trade_currency: "USD",
          currency: "USD",
        },
      ],
      marketPrices: [
        {
          securityId: "SEC_001",
          priceDate: "2026-08-08",
          price: 100,
          currency: "USD",
        },
      ],
      fxRates: [],
    };

    expect(validateIntakeDraft(draft)).toEqual([]);
    const projection = buildIntakeReviewProjection(draft);
    expect(projection).toEqual(
      expect.objectContaining({
        task: "IMPORT_FILE",
        facts: expect.arrayContaining([{ label: "File", value: "portfolio-bundle.csv" }]),
      }),
    );
    const transactionPreview = projection.previewSections?.find(
      ({ title }) => title === "Transaction records",
    );
    const businessDatePreview = projection.previewSections?.find(
      ({ title }) => title === "Business date records",
    );
    expect(transactionPreview?.recordCount).toBe(1);
    expect(transactionPreview?.recordAt(0)).toEqual(
      expect.objectContaining({
        title: "Transaction TRN_001",
        facts: expect.arrayContaining([{ label: "Quantity", value: "10" }]),
      }),
    );
    expect(businessDatePreview?.recordCount).toBe(1);
    expect(businessDatePreview?.recordAt(0)).toEqual({
      title: "Business date 2026-08-08",
      facts: [{ label: "Date", value: "2026-08-08" }],
    });
  });

  it("rejects imported file payloads with invalid row-level source fields", () => {
    const draft = createBlankIntakeDraft("IMPORT_FILE");
    if (draft.task !== "IMPORT_FILE") throw new Error("Unexpected draft");
    draft.fileName = "portfolio-bundle.csv";
    draft.payload = {
      sourceSystem: "OPERATIONS_FILE_IMPORT",
      mode: "UPSERT",
      businessDates: [{ businessDate: "2026-02-31" }],
      portfolios: [
        {
          portfolioId: "",
          baseCurrency: "US",
          openDate: "2026-02-31",
          riskExposure: "",
          investmentTimeHorizon: "Long term",
          portfolioType: "Discretionary",
          bookingCenter: "Singapore",
          cifId: "CIF_001",
          status: "Pending activation",
        },
      ],
      instruments: [
        {
          securityId: "",
          name: "Global Equity Fund",
          isin: "BAD",
          instrumentCurrency: "USD",
          productType: "Fund",
        },
      ],
      transactions: [
        {
          transaction_id: "TRN_001",
          portfolio_id: "",
          instrument_id: "",
          security_id: "",
          transaction_date: "2026-08-08-not-a-timestamp",
          transaction_type: "",
          quantity: 10,
          price: 100,
          gross_transaction_amount: 1_000,
          trade_currency: "USD",
          currency: "USD",
        },
      ],
      marketPrices: [
        {
          securityId: "",
          priceDate: "2026-02-31",
          price: 100,
          currency: "US",
        },
      ],
      fxRates: [],
    };

    expect(validateIntakeDraft(draft)).toEqual(
      expect.arrayContaining([
        { field: "file", message: "Imported portfolio 1: enter the portfolio code." },
        { field: "file", message: "Imported portfolio 1: enter a three-letter base currency." },
        { field: "file", message: "Imported portfolio 1: enter a valid opening date." },
        { field: "file", message: "Imported portfolio 1: enter the approved risk profile." },
        { field: "file", message: "Imported instrument 1: enter the security code." },
        { field: "file", message: "Imported instrument 1: enter a valid 12-character ISIN." },
        { field: "file", message: "Imported transaction 1: enter the portfolio code." },
        { field: "file", message: "Imported transaction 1: enter the security code." },
        { field: "file", message: "Imported transaction 1: enter the transaction type." },
        { field: "file", message: "Imported transaction 1: enter a valid trade date." },
        { field: "file", message: "Imported price 1: enter the security code." },
        { field: "file", message: "Imported price 1: enter a valid observation date." },
        { field: "file", message: "Imported price 1: enter a three-letter currency." },
        { field: "file", message: "Imported business date 1: enter a valid date." },
      ]),
    );
    expect(() => buildIntakeReviewProjection(draft)).toThrow("unresolved validation issues");
  });
});

function readPath(value: unknown, path: readonly (string | number)[]): unknown {
  return path.reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== "object") return undefined;
    return (current as Record<string | number, unknown>)[segment];
  }, value);
}
