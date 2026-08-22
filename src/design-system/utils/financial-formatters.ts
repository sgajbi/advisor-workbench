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

export type BusinessDateParts = {
  year: number;
  month: number;
  day: number;
};

const BUSINESS_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const OFFSET_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;
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

  return `${String(parts.day).padStart(2, "0")} ${SHORT_MONTHS[parts.month - 1]} ${parts.year}`;
}

/**
 * Formats an exact timestamp only when its source value carries `Z` or an explicit offset.
 * Workbench normalizes the instant to UTC and always discloses that zone to the reader.
 */
export function formatTimestampValue(
  value: string | null | undefined,
  { nullDisplay = "N/A" }: DateOptions = {},
): string {
  const candidate = value?.trim();
  if (!candidate || !OFFSET_TIMESTAMP_PATTERN.test(candidate)) {
    return nullDisplay;
  }

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
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

export function isBusinessDateValue(value: string | null | undefined): value is string {
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
