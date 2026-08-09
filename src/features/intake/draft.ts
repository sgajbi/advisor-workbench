import {
  buildCreatePortfolioPayload,
  buildInstrumentsPayloadFromList,
  buildMarketDataPayloadFromList,
  buildPositionSeedPayloadFromList,
  buildTransactionsPayloadFromList,
  type CreatePortfolioInput,
  type InstrumentInput,
  type MarketDataInput,
  type PositionInput,
  type TransactionInput,
} from "./payload-builder";
import type { PortfolioBundlePayload } from "./types";
import { normalizeIntakeDraft } from "./normalization";

export type IntakeManualTask =
  | "CREATE_PORTFOLIO"
  | "ADD_POSITIONS"
  | "ADD_TRANSACTIONS"
  | "ADD_INSTRUMENTS"
  | "ADD_MARKET_DATA";

export type IntakeTask = IntakeManualTask | "IMPORT_FILE";

export type KeyedIntakeRow<T> = {
  rowId: string;
  value: T;
};

export type CreatePortfolioDraft = {
  task: "CREATE_PORTFOLIO";
  input: CreatePortfolioInput;
};

export type PositionDraftValue = Omit<PositionInput, "portfolioId" | "baseCurrency">;
export type TransactionDraftValue = Omit<TransactionInput, "portfolioId" | "baseCurrency">;

export type PositionsDraft = {
  task: "ADD_POSITIONS";
  portfolioId: string;
  baseCurrency: string;
  rows: Array<KeyedIntakeRow<PositionDraftValue>>;
};

export type TransactionsDraft = {
  task: "ADD_TRANSACTIONS";
  portfolioId: string;
  baseCurrency: string;
  rows: Array<KeyedIntakeRow<TransactionDraftValue>>;
};

export type InstrumentsDraft = {
  task: "ADD_INSTRUMENTS";
  rows: Array<KeyedIntakeRow<InstrumentInput>>;
};

export type MarketDataDraft = {
  task: "ADD_MARKET_DATA";
  rows: Array<KeyedIntakeRow<MarketDataInput>>;
};

export type FileImportDraft = {
  task: "IMPORT_FILE";
  fileName: string | null;
  payload: PortfolioBundlePayload | null;
};

export type IntakeDraft =
  | CreatePortfolioDraft
  | PositionsDraft
  | TransactionsDraft
  | InstrumentsDraft
  | MarketDataDraft
  | FileImportDraft;

export type IntakeValidationIssue = {
  field: string;
  message: string;
};

export type IntakeReviewFact = {
  label: string;
  value: string;
};

export type IntakeReviewProjection = {
  task: IntakeTask;
  title: string;
  description: string;
  facts: IntakeReviewFact[];
  previewSections?: IntakeReviewPreviewSection[];
  payload: PortfolioBundlePayload;
};

export type IntakeReviewPreviewSection = {
  title: string;
  records: IntakeReviewPreviewRecord[];
};

export type IntakeReviewPreviewRecord = {
  title: string;
  facts: IntakeReviewFact[];
};

export const INTAKE_TASKS: ReadonlyArray<{
  task: IntakeTask;
  title: string;
  description: string;
  audience: string;
}> = [
  {
    task: "CREATE_PORTFOLIO",
    title: "Create portfolio record",
    description: "Register the portfolio profile and responsible servicing context.",
    audience: "Client and portfolio administration",
  },
  {
    task: "ADD_POSITIONS",
    title: "Load opening positions",
    description: "Publish opening holdings with instrument and valuation references.",
    audience: "Portfolio operations",
  },
  {
    task: "ADD_TRANSACTIONS",
    title: "Record transactions",
    description: "Publish trade activity against an existing portfolio.",
    audience: "Investment operations",
  },
  {
    task: "ADD_INSTRUMENTS",
    title: "Register instruments",
    description: "Add reference data required for portfolio booking and analytics.",
    audience: "Reference data operations",
  },
  {
    task: "ADD_MARKET_DATA",
    title: "Publish price observations",
    description: "Add dated prices for governed portfolio valuation inputs.",
    audience: "Market data operations",
  },
  {
    task: "IMPORT_FILE",
    title: "Import an intake file",
    description: "Parse and review a supported CSV bundle before publication.",
    audience: "Bulk data operations",
  },
] as const;

let rowSequence = 0;

export function createIntakeRowId(): string {
  rowSequence += 1;
  return `intake-row-${rowSequence}`;
}

export function createBlankIntakeDraft(task: IntakeTask): IntakeDraft {
  switch (task) {
    case "CREATE_PORTFOLIO":
      return {
        task,
        input: {
          portfolioId: "",
          baseCurrency: "",
          openDate: "",
          riskExposure: "",
          investmentTimeHorizon: "",
          portfolioType: "",
          bookingCenter: "",
          cifId: "",
          advisorId: "",
          status: "",
        },
      };
    case "ADD_POSITIONS":
      return {
        task,
        portfolioId: "",
        baseCurrency: "",
        rows: [{ rowId: createIntakeRowId(), value: blankPosition() }],
      };
    case "ADD_TRANSACTIONS":
      return {
        task,
        portfolioId: "",
        baseCurrency: "",
        rows: [{ rowId: createIntakeRowId(), value: blankTransaction() }],
      };
    case "ADD_INSTRUMENTS":
      return {
        task,
        rows: [{ rowId: createIntakeRowId(), value: blankInstrument() }],
      };
    case "ADD_MARKET_DATA":
      return {
        task,
        rows: [{ rowId: createIntakeRowId(), value: blankMarketData() }],
      };
    case "IMPORT_FILE":
      return { task, fileName: null, payload: null };
  }
}

export function blankPosition(): PositionDraftValue {
  return {
    securityId: "",
    instrumentName: "",
    isin: "",
    productType: "",
    quantity: 0,
    price: 0,
    effectiveDate: "",
    transactionType: "",
  };
}

export function blankTransaction(): TransactionDraftValue {
  return {
    securityId: "",
    quantity: 0,
    price: 0,
    transactionDate: "",
    transactionType: "",
  };
}

export function blankInstrument(): InstrumentInput {
  return {
    securityId: "",
    name: "",
    isin: "",
    instrumentCurrency: "",
    productType: "",
    assetClass: "",
  };
}

export function blankMarketData(): MarketDataInput {
  return {
    securityId: "",
    priceDate: "",
    price: 0,
    currency: "",
  };
}

export function intakeDraftFingerprint(draft: IntakeDraft): string {
  return JSON.stringify(normalizeIntakeDraft(draft));
}

export function validateIntakeDraft(draft: IntakeDraft): IntakeValidationIssue[] {
  return validateNormalizedIntakeDraft(normalizeIntakeDraft(draft));
}

function validateNormalizedIntakeDraft(draft: IntakeDraft): IntakeValidationIssue[] {
  switch (draft.task) {
    case "CREATE_PORTFOLIO":
      return validatePortfolio(draft.input);
    case "ADD_POSITIONS":
      return [
        ...required("portfolioId", "Enter the target portfolio code.", draft.portfolioId),
        ...currency("baseCurrency", "Enter a three-letter base currency.", draft.baseCurrency),
        ...atLeastOneRow("rows", "Add at least one opening position.", draft.rows.length),
        ...draft.rows.flatMap((row, index) => validatePosition(row, index)),
      ];
    case "ADD_TRANSACTIONS":
      return [
        ...required("portfolioId", "Enter the target portfolio code.", draft.portfolioId),
        ...currency("baseCurrency", "Enter a three-letter base currency.", draft.baseCurrency),
        ...atLeastOneRow("rows", "Add at least one transaction.", draft.rows.length),
        ...draft.rows.flatMap((row, index) => validateTransaction(row, index)),
      ];
    case "ADD_INSTRUMENTS":
      return [
        ...atLeastOneRow("rows", "Add at least one instrument.", draft.rows.length),
        ...draft.rows.flatMap((row, index) => validateInstrument(row, index)),
      ];
    case "ADD_MARKET_DATA":
      return [
        ...atLeastOneRow("rows", "Add at least one price observation.", draft.rows.length),
        ...draft.rows.flatMap((row, index) => validateMarketData(row, index)),
      ];
    case "IMPORT_FILE":
      if (!draft.payload || !draft.fileName || !hasPublishableRecords(draft.payload)) {
        return [{ field: "file", message: "Choose a supported CSV intake file with at least one publishable record." }];
      }
      return validateImportedPayload(draft.payload);
  }
}

export function buildIntakeReviewProjection(draft: IntakeDraft): IntakeReviewProjection {
  const normalizedDraft = normalizeIntakeDraft(draft);
  const issues = validateNormalizedIntakeDraft(normalizedDraft);
  if (issues.length > 0) {
    throw new Error("The intake request has unresolved validation issues.");
  }

  switch (normalizedDraft.task) {
    case "CREATE_PORTFOLIO":
      return {
        task: normalizedDraft.task,
        title: "Review portfolio creation",
        description: "Confirm the portfolio identity, servicing ownership, and opening profile before publication.",
        facts: [
          { label: "Portfolio", value: normalizedDraft.input.portfolioId },
          { label: "Client reference", value: normalizedDraft.input.cifId },
          { label: "Responsible advisor", value: normalizedDraft.input.advisorId },
          { label: "Opening date", value: normalizedDraft.input.openDate },
          { label: "Base currency", value: normalizedDraft.input.baseCurrency },
          { label: "Mandate type", value: normalizedDraft.input.portfolioType },
        ],
        payload: buildCreatePortfolioPayload(normalizedDraft.input),
      };
    case "ADD_POSITIONS":
      return {
        task: normalizedDraft.task,
        title: "Review opening positions",
        description: "Confirm the target portfolio and every opening holding before publication.",
        facts: [
          { label: "Portfolio", value: normalizedDraft.portfolioId },
          { label: "Base currency", value: normalizedDraft.baseCurrency },
          { label: "Position rows", value: String(normalizedDraft.rows.length) },
          { label: "Effective date", value: dateRange(normalizedDraft.rows.map((row) => row.value.effectiveDate)) },
        ],
        payload: buildPositionSeedPayloadFromList(
          normalizedDraft.portfolioId,
          normalizedDraft.baseCurrency,
          normalizedDraft.rows.map((row) => ({
            ...row.value,
            portfolioId: normalizedDraft.portfolioId,
            baseCurrency: normalizedDraft.baseCurrency,
          })),
        ),
      };
    case "ADD_TRANSACTIONS":
      return {
        task: normalizedDraft.task,
        title: "Review transactions",
        description: "Confirm the target portfolio, trade dates, quantities, and prices before publication.",
        facts: [
          { label: "Portfolio", value: normalizedDraft.portfolioId },
          { label: "Trade currency", value: normalizedDraft.baseCurrency },
          { label: "Transaction rows", value: String(normalizedDraft.rows.length) },
          { label: "Trade date", value: dateRange(normalizedDraft.rows.map((row) => row.value.transactionDate)) },
        ],
        payload: buildTransactionsPayloadFromList(
          normalizedDraft.portfolioId,
          normalizedDraft.baseCurrency,
          normalizedDraft.rows.map((row) => ({
            ...row.value,
            portfolioId: normalizedDraft.portfolioId,
            baseCurrency: normalizedDraft.baseCurrency,
          })),
        ),
      };
    case "ADD_INSTRUMENTS":
      return {
        task: normalizedDraft.task,
        title: "Review instrument reference data",
        description: "Confirm security identifiers and classification before publication.",
        facts: [
          { label: "Instrument rows", value: String(normalizedDraft.rows.length) },
          { label: "Currencies", value: uniqueSummary(normalizedDraft.rows.map((row) => row.value.instrumentCurrency)) },
          { label: "Asset classes", value: uniqueSummary(normalizedDraft.rows.map((row) => row.value.assetClass)) },
        ],
        payload: buildInstrumentsPayloadFromList(normalizedDraft.rows.map((row) => row.value)),
      };
    case "ADD_MARKET_DATA":
      return {
        task: normalizedDraft.task,
        title: "Review price observations",
        description: "Confirm the instruments, observation dates, prices, and currencies before publication.",
        facts: [
          { label: "Price rows", value: String(normalizedDraft.rows.length) },
          { label: "Observation date", value: dateRange(normalizedDraft.rows.map((row) => row.value.priceDate)) },
          { label: "Currencies", value: uniqueSummary(normalizedDraft.rows.map((row) => row.value.currency)) },
        ],
        payload: buildMarketDataPayloadFromList(normalizedDraft.rows.map((row) => row.value)),
      };
    case "IMPORT_FILE":
      if (!normalizedDraft.payload || !normalizedDraft.fileName) {
        throw new Error("Choose a supported CSV intake file to review.");
      }
      return {
        task: normalizedDraft.task,
        title: "Review imported intake bundle",
        description: "Confirm the parsed file contents before any records are published.",
        facts: [
          { label: "File", value: normalizedDraft.fileName },
          { label: "Portfolios", value: String(normalizedDraft.payload.portfolios.length) },
          { label: "Instruments", value: String(normalizedDraft.payload.instruments.length) },
          { label: "Transactions", value: String(normalizedDraft.payload.transactions.length) },
          { label: "Price observations", value: String(normalizedDraft.payload.marketPrices.length) },
          { label: "Business dates", value: String(normalizedDraft.payload.businessDates.length) },
        ],
        previewSections: fileImportPreviewSections(normalizedDraft.payload),
        payload: normalizedDraft.payload,
      };
  }
}

function hasPublishableRecords(payload: PortfolioBundlePayload): boolean {
  return (
    payload.portfolios.length +
      payload.instruments.length +
      payload.transactions.length +
      payload.marketPrices.length +
      payload.fxRates.length +
      payload.businessDates.length >
    0
  );
}

function fileImportPreviewSections(payload: PortfolioBundlePayload): IntakeReviewPreviewSection[] {
  return [
    {
      title: "Portfolio records",
      records: payload.portfolios.map((portfolio) => ({
        title: `Portfolio ${portfolio.portfolioId}`,
        facts: [
          { label: "Client reference", value: portfolio.cifId },
          { label: "Advisor", value: portfolio.advisorId ?? "Not provided" },
          { label: "Base currency", value: portfolio.baseCurrency },
          { label: "Opening date", value: portfolio.openDate },
          { label: "Mandate type", value: portfolio.portfolioType },
          { label: "Status", value: portfolio.status },
        ],
      })),
    },
    {
      title: "Instrument records",
      records: payload.instruments.map((instrument) => ({
        title: `Instrument ${instrument.securityId}`,
        facts: [
          { label: "Name", value: instrument.name },
          { label: "ISIN", value: instrument.isin },
          { label: "Currency", value: instrument.instrumentCurrency },
          { label: "Product type", value: instrument.productType },
          { label: "Asset class", value: instrument.assetClass ?? "Not provided" },
        ],
      })),
    },
    {
      title: "Transaction records",
      records: payload.transactions.map((transaction) => ({
        title: `Transaction ${transaction.transaction_id}`,
        facts: [
          { label: "Portfolio", value: transaction.portfolio_id },
          { label: "Security", value: transaction.security_id },
          { label: "Type", value: transaction.transaction_type },
          { label: "Quantity", value: String(transaction.quantity) },
          { label: "Price", value: String(transaction.price) },
          { label: "Trade date", value: transaction.transaction_date },
        ],
      })),
    },
    {
      title: "Price observation records",
      records: payload.marketPrices.map((price) => ({
        title: `Price ${price.securityId} ${price.priceDate}`,
        facts: [
          { label: "Security", value: price.securityId },
          { label: "Observation date", value: price.priceDate },
          { label: "Price", value: String(price.price) },
          { label: "Currency", value: price.currency },
        ],
      })),
    },
    {
      title: "Business date records",
      records: payload.businessDates.map((businessDate) => ({
        title: `Business date ${businessDate.businessDate}`,
        facts: [{ label: "Date", value: businessDate.businessDate }],
      })),
    },
  ].filter((section) => section.records.length > 0);
}

function validateImportedPayload(payload: PortfolioBundlePayload): IntakeValidationIssue[] {
  return [
    ...payload.portfolios.flatMap((portfolio, index) => [
      ...required("file", `Imported portfolio ${index + 1}: enter the portfolio code.`, portfolio.portfolioId),
      ...currency("file", `Imported portfolio ${index + 1}: enter a three-letter base currency.`, portfolio.baseCurrency),
      ...date("file", `Imported portfolio ${index + 1}: enter a valid opening date.`, portfolio.openDate),
      ...required("file", `Imported portfolio ${index + 1}: enter the approved risk profile.`, portfolio.riskExposure),
      ...required(
        "file",
        `Imported portfolio ${index + 1}: enter the investment time horizon.`,
        portfolio.investmentTimeHorizon,
      ),
      ...required("file", `Imported portfolio ${index + 1}: enter the mandate type.`, portfolio.portfolioType),
      ...required("file", `Imported portfolio ${index + 1}: enter the booking centre.`, portfolio.bookingCenter),
      ...required("file", `Imported portfolio ${index + 1}: enter the client reference.`, portfolio.cifId),
      ...required("file", `Imported portfolio ${index + 1}: enter the opening portfolio status.`, portfolio.status),
    ]),
    ...payload.instruments.flatMap((instrument, index) => [
      ...required("file", `Imported instrument ${index + 1}: enter the security code.`, instrument.securityId),
      ...required("file", `Imported instrument ${index + 1}: enter the instrument name.`, instrument.name),
      ...isin("file", `Imported instrument ${index + 1}: enter a valid 12-character ISIN.`, instrument.isin),
      ...currency(
        "file",
        `Imported instrument ${index + 1}: enter a three-letter currency.`,
        instrument.instrumentCurrency,
      ),
      ...required("file", `Imported instrument ${index + 1}: enter the product type.`, instrument.productType),
    ]),
    ...payload.transactions.flatMap((transaction, index) => [
      ...required("file", `Imported transaction ${index + 1}: enter the portfolio code.`, transaction.portfolio_id),
      ...required("file", `Imported transaction ${index + 1}: enter the security code.`, transaction.security_id),
      ...required("file", `Imported transaction ${index + 1}: enter the transaction type.`, transaction.transaction_type),
      ...positive("file", `Imported transaction ${index + 1}: enter a quantity greater than zero.`, transaction.quantity),
      ...positive("file", `Imported transaction ${index + 1}: enter a price greater than zero.`, transaction.price),
      ...dateTime("file", `Imported transaction ${index + 1}: enter a valid trade date.`, transaction.transaction_date),
      ...currency("file", `Imported transaction ${index + 1}: enter a three-letter trade currency.`, transaction.currency),
    ]),
    ...payload.marketPrices.flatMap((price, index) => [
      ...required("file", `Imported price ${index + 1}: enter the security code.`, price.securityId),
      ...date("file", `Imported price ${index + 1}: enter a valid observation date.`, price.priceDate),
      ...positive("file", `Imported price ${index + 1}: enter a price greater than zero.`, price.price),
      ...currency("file", `Imported price ${index + 1}: enter a three-letter currency.`, price.currency),
    ]),
    ...payload.businessDates.flatMap((businessDate, index) =>
      date("file", `Imported business date ${index + 1}: enter a valid date.`, businessDate.businessDate),
    ),
  ];
}

function validatePortfolio(input: CreatePortfolioInput): IntakeValidationIssue[] {
  return [
    ...required("portfolioId", "Enter the new portfolio code.", input.portfolioId),
    ...currency("baseCurrency", "Enter a three-letter base currency.", input.baseCurrency),
    ...date("openDate", "Enter a valid opening date.", input.openDate),
    ...required("riskExposure", "Enter the approved risk profile.", input.riskExposure),
    ...required("investmentTimeHorizon", "Enter the investment time horizon.", input.investmentTimeHorizon),
    ...required("portfolioType", "Enter the mandate type.", input.portfolioType),
    ...required("bookingCenter", "Enter the booking centre.", input.bookingCenter),
    ...required("cifId", "Enter the client reference.", input.cifId),
    ...required("advisorId", "Enter the responsible advisor code.", input.advisorId),
    ...required("status", "Enter the opening portfolio status.", input.status),
  ];
}

function validatePosition(row: KeyedIntakeRow<PositionDraftValue>, index: number): IntakeValidationIssue[] {
  const prefix = `rows.${row.rowId}`;
  const label = `Position ${index + 1}`;
  return [
    ...required(`${prefix}.securityId`, `${label}: enter the security code.`, row.value.securityId),
    ...required(`${prefix}.instrumentName`, `${label}: enter the instrument name.`, row.value.instrumentName),
    ...isin(`${prefix}.isin`, `${label}: enter a valid 12-character ISIN.`, row.value.isin),
    ...required(`${prefix}.productType`, `${label}: enter the product type.`, row.value.productType),
    ...positive(`${prefix}.quantity`, `${label}: enter a quantity greater than zero.`, row.value.quantity),
    ...positive(`${prefix}.price`, `${label}: enter a price greater than zero.`, row.value.price),
    ...date(`${prefix}.effectiveDate`, `${label}: enter a valid effective date.`, row.value.effectiveDate),
    ...required(`${prefix}.transactionType`, `${label}: enter the booking type.`, row.value.transactionType),
  ];
}

function validateTransaction(row: KeyedIntakeRow<TransactionDraftValue>, index: number): IntakeValidationIssue[] {
  const prefix = `rows.${row.rowId}`;
  const label = `Transaction ${index + 1}`;
  return [
    ...required(`${prefix}.securityId`, `${label}: enter the security code.`, row.value.securityId),
    ...required(`${prefix}.transactionType`, `${label}: enter the transaction type.`, row.value.transactionType),
    ...positive(`${prefix}.quantity`, `${label}: enter a quantity greater than zero.`, row.value.quantity),
    ...positive(`${prefix}.price`, `${label}: enter a price greater than zero.`, row.value.price),
    ...date(`${prefix}.transactionDate`, `${label}: enter a valid trade date.`, row.value.transactionDate),
  ];
}

function validateInstrument(row: KeyedIntakeRow<InstrumentInput>, index: number): IntakeValidationIssue[] {
  const prefix = `rows.${row.rowId}`;
  const label = `Instrument ${index + 1}`;
  return [
    ...required(`${prefix}.securityId`, `${label}: enter the security code.`, row.value.securityId),
    ...required(`${prefix}.name`, `${label}: enter the instrument name.`, row.value.name),
    ...isin(`${prefix}.isin`, `${label}: enter a valid 12-character ISIN.`, row.value.isin),
    ...currency(`${prefix}.instrumentCurrency`, `${label}: enter a three-letter currency.`, row.value.instrumentCurrency),
    ...required(`${prefix}.productType`, `${label}: enter the product type.`, row.value.productType),
    ...required(`${prefix}.assetClass`, `${label}: enter the asset class.`, row.value.assetClass),
  ];
}

function validateMarketData(row: KeyedIntakeRow<MarketDataInput>, index: number): IntakeValidationIssue[] {
  const prefix = `rows.${row.rowId}`;
  const label = `Price observation ${index + 1}`;
  return [
    ...required(`${prefix}.securityId`, `${label}: enter the security code.`, row.value.securityId),
    ...date(`${prefix}.priceDate`, `${label}: enter a valid observation date.`, row.value.priceDate),
    ...positive(`${prefix}.price`, `${label}: enter a price greater than zero.`, row.value.price),
    ...currency(`${prefix}.currency`, `${label}: enter a three-letter currency.`, row.value.currency),
  ];
}

function required(field: string, message: string, value: string): IntakeValidationIssue[] {
  return value.trim() ? [] : [{ field, message }];
}

function currency(field: string, message: string, value: string): IntakeValidationIssue[] {
  return /^[A-Za-z]{3}$/.test(value.trim()) ? [] : [{ field, message }];
}

function isin(field: string, message: string, value: string): IntakeValidationIssue[] {
  return /^[A-Za-z0-9]{12}$/.test(value.trim()) ? [] : [{ field, message }];
}

function date(field: string, message: string, value: string): IntakeValidationIssue[] {
  return isStrictIsoDate(value) ? [] : [{ field, message }];
}

function dateTime(field: string, message: string, value: string): IntakeValidationIssue[] {
  const match = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  return match && isStrictIsoDate(match[1]) && Number.isFinite(Date.parse(value))
    ? []
    : [{ field, message }];
}

function positive(field: string, message: string, value: number): IntakeValidationIssue[] {
  return Number.isFinite(value) && value > 0 ? [] : [{ field, message }];
}

function atLeastOneRow(field: string, message: string, count: number): IntakeValidationIssue[] {
  return count > 0 ? [] : [{ field, message }];
}

function isStrictIsoDate(value: string): boolean {
  const match = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/.exec(value);
  if (!match?.groups) return false;

  const year = Number(match.groups.year);
  const month = Number(match.groups.month);
  const day = Number(match.groups.day);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function dateRange(values: string[]): string {
  const sorted = [...new Set(values)].sort();
  return sorted.length === 1 ? sorted[0] : `${sorted[0]} to ${sorted[sorted.length - 1]}`;
}

function uniqueSummary(values: string[]): string {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].join(", ");
}
