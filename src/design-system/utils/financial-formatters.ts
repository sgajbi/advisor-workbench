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
  if (!value) {
    return nullDisplay;
  }

  const normalized = value.includes("T") ? value : `${value}T00:00:00Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
