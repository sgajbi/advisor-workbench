type PercentOptions = {
  nullDisplay?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

type CurrencyOptions = {
  currency?: string;
  nullDisplay?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  display?: "symbol" | "code";
};

type NumberOptions = {
  nullDisplay?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

type DateOptions = {
  nullDisplay?: string;
};

type YearMonthOptions = DateOptions & {
  compact?: boolean;
};

export type BusinessDateParts = {
  year: number;
  month: number;
  day: number;
};

const BUSINESS_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const OFFSET_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/i;
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const PRODUCT_DATE_LOCALE = "en-SG";

export function formatPercent(
  value: number | null | undefined,
  {
    nullDisplay = "N/A",
    minimumFractionDigits = 2,
    maximumFractionDigits = minimumFractionDigits,
  }: PercentOptions = {}
): string {
  if (typeof value !== "number") {
    return nullDisplay;
  }

  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)}%`;
}

export function formatCurrencyValue(
  value: number | null | undefined,
  {
    currency = "USD",
    nullDisplay = "N/A",
    minimumFractionDigits,
    maximumFractionDigits = 2,
    display = "code",
  }: CurrencyOptions = {}
): string {
  if (typeof value !== "number") {
    return nullDisplay;
  }

  if (display === "symbol") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  }

  return `${formatNumber(value, {
    nullDisplay,
    minimumFractionDigits,
    maximumFractionDigits,
  })} ${currency}`;
}

export function formatNumber(
  value: number | null | undefined,
  {
    nullDisplay = "N/A",
    minimumFractionDigits = Number.isInteger(value ?? NaN) ? 0 : undefined,
    maximumFractionDigits = 2,
  }: NumberOptions = {}
): string {
  if (typeof value !== "number") {
    return nullDisplay;
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function formatDateValue(
  value: string | null | undefined,
  { nullDisplay = "N/A" }: DateOptions = {}
): string {
  return isBusinessDateValue(value)
    ? formatBusinessDateValue(value, { nullDisplay })
    : formatTimestampValue(value, { nullDisplay });
}

/**
 * Formats a source-owned calendar date without turning it into a midnight instant.
 * Business dates have no timezone: their year, month, and day must remain unchanged.
 */
export function formatBusinessDateValue(
  value: string | null | undefined,
  { nullDisplay = "N/A" }: DateOptions = {},
): string {
  const parts = parseBusinessDateValue(value);
  if (!parts) {
    return nullDisplay;
  }

  return formatBusinessDateParts(parts);
}

/**
 * Format a source-owned `YYYY-MM` reporting period without inventing a day or timezone.
 * Use this for chart axes and period labels, never for business dates or exact instants.
 */
export function formatYearMonthValue(
  value: string | null | undefined,
  { compact = false, nullDisplay = "N/A" }: YearMonthOptions = {},
): string {
  const match = value?.trim().match(/^(\d{4})-(\d{2})$/);
  const month = Number(match?.[2]);
  if (!match || month < 1 || month > 12) {
    return nullDisplay;
  }

  const monthLabel = SHORT_MONTHS[month - 1];
  const shortYear = match[1].slice(-2);
  return `${monthLabel}${compact ? "\n" : " "}'${shortYear}`;
}

/**
 * Formats a field whose domain meaning is a calendar date even when a legacy
 * contract encodes that date as an offset-bearing timestamp. Timestamp inputs
 * are normalized to the product's disclosed UTC convention before selecting
 * their calendar components. Do not use this for audit or generated-at instants.
 */
export function formatCalendarDateValue(
  value: string | null | undefined,
  { nullDisplay = "N/A" }: DateOptions = {},
): string {
  const businessDate = parseBusinessDateValue(value);
  if (businessDate) {
    return formatBusinessDateParts(businessDate);
  }

  const timestamp = parseTimestampValue(value);
  if (!timestamp) {
    return nullDisplay;
  }

  return formatBusinessDateParts({
    year: timestamp.getUTCFullYear(),
    month: timestamp.getUTCMonth() + 1,
    day: timestamp.getUTCDate(),
  });
}

/**
 * Formats an exact timestamp only when its source value carries `Z` or an explicit offset.
 * Workbench normalizes the instant to UTC and always discloses that zone to the reader.
 */
export function formatTimestampValue(
  value: string | null | undefined,
  { nullDisplay = "N/A" }: DateOptions = {},
): string {
  const parsed = parseTimestampValue(value);
  if (!parsed) {
    return nullDisplay;
  }

  return new Intl.DateTimeFormat(PRODUCT_DATE_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(parsed);
}

export function isTimestampValue(value: string | null | undefined): boolean {
  return parseTimestampValue(value) !== null;
}

export function timestampsRepresentSameInstant(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const leftInstant = parseTimestampInstant(left);
  const rightInstant = parseTimestampInstant(right);
  return Boolean(
    leftInstant &&
      rightInstant &&
      leftInstant.epochSecond === rightInstant.epochSecond &&
      leftInstant.fractionalSecond === rightInstant.fractionalSecond,
  );
}

export function isBusinessDateValue(value: string | null | undefined): boolean {
  return parseBusinessDateValue(value) !== null;
}

export function parseBusinessDateValue(
  value: string | null | undefined,
): BusinessDateParts | null {
  const match = value?.trim().match(BUSINESS_DATE_PATTERN);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }

  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leapYear ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function formatBusinessDateParts(parts: BusinessDateParts): string {
  return `${String(parts.day).padStart(2, "0")} ${SHORT_MONTHS[parts.month - 1]} ${parts.year}`;
}

function parseTimestampValue(value: string | null | undefined): Date | null {
  const candidate = value?.trim();
  const match = candidate?.match(OFFSET_TIMESTAMP_PATTERN);
  if (!candidate || !match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[7] === undefined ? 0 : Number(match[7]);
  const offsetMinute = match[8] === undefined ? 0 : Number(match[8]);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return null;
  }

  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTimestampInstant(
  value: string | null | undefined,
): { epochSecond: number; fractionalSecond: string } | null {
  const candidate = value;
  if (!candidate || candidate !== candidate.trim()) {
    return null;
  }
  const parsed = parseTimestampValue(candidate);
  if (!parsed) {
    return null;
  }
  const fractionalMatch = candidate.match(
    /:\d{2}(?:\.(\d+))?(?:Z|[+-]\d{2}:\d{2})$/i,
  );
  if (!fractionalMatch) {
    return null;
  }
  return {
    epochSecond: Math.floor(parsed.getTime() / 1_000),
    fractionalSecond: (fractionalMatch[1] ?? "").replace(/0+$/, ""),
  };
}
