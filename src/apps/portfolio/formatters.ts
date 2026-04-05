import {
  formatCurrencyValue,
  formatDateValue,
  formatNumber,
  formatPercent,
} from "@/design-system/utils/financial-formatters";

export function formatPct(value: number | null | undefined): string {
  return formatPercent(value);
}

export function formatCurrency(
  value: number | null | undefined,
  currency: string | undefined
): string {
  return formatCurrencyValue(value, {
    currency: currency ?? "USD",
    display: "code",
    maximumFractionDigits: 2,
  });
}

export function formatQuantity(value: number | null | undefined): string {
  return formatNumber(value, {
    maximumFractionDigits: 4,
  });
}

export function formatDate(value: string | null | undefined): string {
  return formatDateValue(value);
}

export function formatBooleanFlag(value: boolean | null | undefined): string {
  if (typeof value !== "boolean") {
    return "N/A";
  }
  return value ? "Yes" : "No";
}

export function formatCount(
  value: number | null | undefined,
  singularLabel: string,
  pluralLabel?: string
): string {
  if (typeof value !== "number") {
    return `0 ${pluralLabel ?? `${singularLabel}s`}`;
  }

  const resolvedPluralLabel = pluralLabel ?? `${singularLabel}s`;
  return `${formatCompactNumber(value, 0)} ${value === 1 ? singularLabel : resolvedPluralLabel}`;
}

export function formatStatus(value: string | null | undefined): string {
  if (!value) {
    return "N/A";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

export function formatBookingCenter(value: string | null | undefined): string {
  if (!value) {
    return "N/A";
  }

  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case "SG":
      return "Singapore";
    default:
      return value;
  }
}

function formatCompactNumber(value: number, maximumFractionDigits: number): string {
  return formatNumber(value, {
    maximumFractionDigits,
  });
}
