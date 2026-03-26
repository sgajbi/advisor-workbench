export function formatPct(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}

export function formatCurrency(
  value: number | null | undefined,
  currency: string | undefined
): string {
  if (typeof value !== "number") {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatQuantity(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
}
