import {
  formatCurrencyValue,
  formatDateValue,
  formatPercent,
} from "@/design-system/utils/financial-formatters";

export function formatPct(value: number | null | undefined): string {
  return formatPercent(value);
}

export function formatCompactPct(value: number | null | undefined): string {
  return formatPercent(value, { nullDisplay: "--" });
}

export function formatCurrency(value: number | null | undefined, currency: string): string {
  return formatCurrencyValue(value, {
    currency,
    display: "symbol",
    maximumFractionDigits: 0,
  });
}

export function formatDate(value: string | null | undefined): string {
  return formatDateValue(value);
}

export function formatLabel(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatPerformancePositionLabel(value: string): string {
  const rawIdentifier = value.includes(":") ? value.split(":").at(-1) ?? value : value;
  const normalizedIdentifier = rawIdentifier.replace(
    /^(FO_EQ_|FO_ETF_|FO_FUND_|FO_BOND_|FO_PRIV_|CASH_)/,
    ""
  );
  return normalizedIdentifier.replaceAll("_", " ");
}
