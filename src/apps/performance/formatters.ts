export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}

export function formatCompactPct(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${value.toFixed(2)}%`;
}

export function formatCurrency(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "N/A";
  }
  return value;
}

export function formatLabel(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
