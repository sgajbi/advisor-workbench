import { PortfolioBundlePayload } from "./types";

const REQUIRED_HEADERS = [
  "portfolio_id",
  "base_currency",
  "open_date",
  "risk_exposure",
  "investment_time_horizon",
  "portfolio_type",
  "booking_center",
  "cif_id",
  "advisor_id",
  "status",
  "security_id",
  "instrument_name",
  "isin",
  "product_type",
  "transaction_type",
  "quantity",
  "price",
  "transaction_date",
] as const;

type ParsedRow = Record<(typeof REQUIRED_HEADERS)[number], string>;

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function parseRows(csvText: string): ParsedRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    throw new Error(`CSV missing required columns: ${missing.join(", ")}`);
  }

  const rows: ParsedRow[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = splitCsvLine(lines[index]);
    if (values.length < headers.length) {
      throw new Error(`Row ${index + 1} has fewer values than headers.`);
    }

    const row = {} as ParsedRow;
    REQUIRED_HEADERS.forEach((header) => {
      const headerIndex = headers.indexOf(header);
      row[header] = values[headerIndex] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

export function parseIntakeCsvToBundle(csvText: string): PortfolioBundlePayload {
  const rows = parseRows(csvText);
  const first = rows[0];

  const instrumentsBySecurity = new Map<string, PortfolioBundlePayload["instruments"][number]>();
  const marketPricesBySecurity = new Map<string, PortfolioBundlePayload["marketPrices"][number]>();

  const transactions = rows.map((row, index) => {
    const quantity = Number(row.quantity);
    const price = Number(row.price);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Row ${index + 2} has invalid quantity.`);
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Row ${index + 2} has invalid price.`);
    }

    const securityId = row.security_id;
    instrumentsBySecurity.set(securityId, {
      securityId,
      name: row.instrument_name,
      isin: row.isin,
      instrumentCurrency: row.base_currency,
      productType: row.product_type,
      assetClass: row.product_type,
    });

    marketPricesBySecurity.set(securityId, {
      securityId,
      priceDate: row.transaction_date.slice(0, 10),
      price,
      currency: row.base_currency,
    });

    return {
      transaction_id: `TRN_${row.portfolio_id}_${securityId}_${index + 1}`,
      portfolio_id: row.portfolio_id,
      instrument_id: securityId,
      security_id: securityId,
      transaction_date: row.transaction_date,
      transaction_type: row.transaction_type,
      quantity,
      price,
      gross_transaction_amount: quantity * price,
      trade_currency: row.base_currency,
      currency: row.base_currency,
    };
  });

  return {
    sourceSystem: "ADVISOR_WORKBENCH_UI_CSV",
    mode: "UPSERT",
    businessDates: [{ businessDate: first.open_date }],
    portfolios: [
      {
        portfolioId: first.portfolio_id,
        baseCurrency: first.base_currency,
        openDate: first.open_date,
        riskExposure: first.risk_exposure,
        investmentTimeHorizon: first.investment_time_horizon,
        portfolioType: first.portfolio_type,
        bookingCenter: first.booking_center,
        cifId: first.cif_id,
        advisorId: first.advisor_id,
        status: first.status,
      },
    ],
    instruments: [...instrumentsBySecurity.values()],
    transactions,
    marketPrices: [...marketPricesBySecurity.values()],
    fxRates: [],
  };
}
