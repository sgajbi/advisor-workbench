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
  payload: PortfolioBundlePayload;
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
  return JSON.stringify(draft);
}

export function validateIntakeDraft(draft: IntakeDraft): IntakeValidationIssue[] {
  switch (draft.task) {
    case "CREATE_PORTFOLIO":
      return validatePortfolio(draft.input);
    case "ADD_POSITIONS":
      return [
        ...required("portfolioId", "Enter the target portfolio code.", draft.portfolioId),
        ...currency("baseCurrency", "Enter a three-letter base currency.", draft.baseCurrency),
        ...draft.rows.flatMap((row, index) => validatePosition(row, index)),
      ];
    case "ADD_TRANSACTIONS":
      return [
        ...required("portfolioId", "Enter the target portfolio code.", draft.portfolioId),
        ...currency("baseCurrency", "Enter a three-letter base currency.", draft.baseCurrency),
        ...draft.rows.flatMap((row, index) => validateTransaction(row, index)),
      ];
    case "ADD_INSTRUMENTS":
      return draft.rows.flatMap((row, index) => validateInstrument(row, index));
    case "ADD_MARKET_DATA":
      return draft.rows.flatMap((row, index) => validateMarketData(row, index));
    case "IMPORT_FILE":
      return draft.payload && draft.fileName
        ? []
        : [{ field: "file", message: "Choose a supported CSV intake file to review." }];
  }
}

export function buildIntakeReviewProjection(draft: IntakeDraft): IntakeReviewProjection {
  const issues = validateIntakeDraft(draft);
  if (issues.length > 0) {
    throw new Error("The intake request has unresolved validation issues.");
  }

  switch (draft.task) {
    case "CREATE_PORTFOLIO":
      return {
        task: draft.task,
        title: "Review portfolio creation",
        description: "Confirm the portfolio identity, servicing ownership, and opening profile before publication.",
        facts: [
          { label: "Portfolio", value: draft.input.portfolioId },
          { label: "Client reference", value: draft.input.cifId },
          { label: "Responsible advisor", value: draft.input.advisorId },
          { label: "Opening date", value: draft.input.openDate },
          { label: "Base currency", value: draft.input.baseCurrency },
          { label: "Mandate type", value: draft.input.portfolioType },
        ],
        payload: buildCreatePortfolioPayload(draft.input),
      };
    case "ADD_POSITIONS":
      return {
        task: draft.task,
        title: "Review opening positions",
        description: "Confirm the target portfolio and every opening holding before publication.",
        facts: [
          { label: "Portfolio", value: draft.portfolioId },
          { label: "Base currency", value: draft.baseCurrency },
          { label: "Position rows", value: String(draft.rows.length) },
          { label: "Effective date", value: dateRange(draft.rows.map((row) => row.value.effectiveDate)) },
        ],
        payload: buildPositionSeedPayloadFromList(
          draft.portfolioId,
          draft.baseCurrency,
          draft.rows.map((row) => ({ ...row.value, portfolioId: draft.portfolioId, baseCurrency: draft.baseCurrency })),
        ),
      };
    case "ADD_TRANSACTIONS":
      return {
        task: draft.task,
        title: "Review transactions",
        description: "Confirm the target portfolio, trade dates, quantities, and prices before publication.",
        facts: [
          { label: "Portfolio", value: draft.portfolioId },
          { label: "Trade currency", value: draft.baseCurrency },
          { label: "Transaction rows", value: String(draft.rows.length) },
          { label: "Trade date", value: dateRange(draft.rows.map((row) => row.value.transactionDate)) },
        ],
        payload: buildTransactionsPayloadFromList(
          draft.portfolioId,
          draft.baseCurrency,
          draft.rows.map((row) => ({ ...row.value, portfolioId: draft.portfolioId, baseCurrency: draft.baseCurrency })),
        ),
      };
    case "ADD_INSTRUMENTS":
      return {
        task: draft.task,
        title: "Review instrument reference data",
        description: "Confirm security identifiers and classification before publication.",
        facts: [
          { label: "Instrument rows", value: String(draft.rows.length) },
          { label: "Currencies", value: uniqueSummary(draft.rows.map((row) => row.value.instrumentCurrency)) },
          { label: "Asset classes", value: uniqueSummary(draft.rows.map((row) => row.value.assetClass)) },
        ],
        payload: buildInstrumentsPayloadFromList(draft.rows.map((row) => row.value)),
      };
    case "ADD_MARKET_DATA":
      return {
        task: draft.task,
        title: "Review price observations",
        description: "Confirm the instruments, observation dates, prices, and currencies before publication.",
        facts: [
          { label: "Price rows", value: String(draft.rows.length) },
          { label: "Observation date", value: dateRange(draft.rows.map((row) => row.value.priceDate)) },
          { label: "Currencies", value: uniqueSummary(draft.rows.map((row) => row.value.currency)) },
        ],
        payload: buildMarketDataPayloadFromList(draft.rows.map((row) => row.value)),
      };
    case "IMPORT_FILE":
      if (!draft.payload || !draft.fileName) {
        throw new Error("Choose a supported CSV intake file to review.");
      }
      return {
        task: draft.task,
        title: "Review imported intake bundle",
        description: "Confirm the parsed file contents before any records are published.",
        facts: [
          { label: "File", value: draft.fileName },
          { label: "Portfolios", value: String(draft.payload.portfolios.length) },
          { label: "Instruments", value: String(draft.payload.instruments.length) },
          { label: "Transactions", value: String(draft.payload.transactions.length) },
          { label: "Price observations", value: String(draft.payload.marketPrices.length) },
        ],
        payload: draft.payload,
      };
  }
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
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    ? []
    : [{ field, message }];
}

function positive(field: string, message: string, value: number): IntakeValidationIssue[] {
  return Number.isFinite(value) && value > 0 ? [] : [{ field, message }];
}

function dateRange(values: string[]): string {
  const sorted = [...new Set(values)].sort();
  return sorted.length === 1 ? sorted[0] : `${sorted[0]} to ${sorted[sorted.length - 1]}`;
}

function uniqueSummary(values: string[]): string {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].join(", ");
}
