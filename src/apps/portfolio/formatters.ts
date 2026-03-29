export function formatPct(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "N/A";
  }
  return `${formatFixedNumber(value, 2)}%`;
}

export function formatCurrency(
  value: number | null | undefined,
  currency: string | undefined
): string {
  if (typeof value !== "number") {
    return "N/A";
  }
  return `${formatCompactNumber(value, 2)} ${currency ?? "USD"}`;
}

export function formatQuantity(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : undefined,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "N/A";
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
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : undefined,
    maximumFractionDigits,
  }).format(value);
}

function formatFixedNumber(value: number, fractionDigits: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
