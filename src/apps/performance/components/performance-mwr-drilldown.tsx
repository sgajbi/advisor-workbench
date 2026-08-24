import type { MoneyWeightedReturnSummary } from "@/features/workbench/types";

import { formatPct } from "../formatters";
import { PERFORMANCE_RETURN_LABELS } from "../performance-terminology";

export type PerformanceMwrDrilldownModel = {
  summaryLabel: string;
  statusLabel: string | null;
  methodLabel: string | null;
  inputModeLabel: string | null;
  annualizedLabel: string | null;
  holdingPeriodLabel: string | null;
  approximationLabel: string | null;
  fallbackLabel: string | null;
  reasonCodes: string[];
  warnings: string[];
  notes: string[];
};

export function buildPerformanceMwrDrilldown(
  moneyWeightedReturn?: MoneyWeightedReturnSummary | null
): PerformanceMwrDrilldownModel | null {
  if (!moneyWeightedReturn) {
    return null;
  }

  const reasonCodes = normalizeTextArray(moneyWeightedReturn.reason_codes);
  const warnings = normalizeTextArray(moneyWeightedReturn.warnings);
  const notes = normalizeTextArray(moneyWeightedReturn.notes);
  const fallbackLabel = buildFallbackLabel(moneyWeightedReturn);
  const status = normalizeText(moneyWeightedReturn.status);
  const isApproximation = moneyWeightedReturn.is_approximation === true;
  const hasSupportSignal =
    reasonCodes.length > 0 ||
    warnings.length > 0 ||
    Boolean(fallbackLabel) ||
    isApproximation ||
    (status !== null && status !== "CALCULATED");

  if (!hasSupportSignal) {
    return null;
  }

  const summaryParts = [
    status ? formatMwrContractLabel(status) : null,
    moneyWeightedReturn.method ? formatMwrMethodLabel(moneyWeightedReturn.method) : null,
    isApproximation ? "Approximation" : null,
  ].filter(Boolean);

  return {
    summaryLabel: summaryParts.join(" • ") || "Method evidence",
    statusLabel: status ? formatMwrContractLabel(status) : null,
    methodLabel: moneyWeightedReturn.method
      ? formatMwrMethodLabel(moneyWeightedReturn.method)
      : null,
    inputModeLabel: moneyWeightedReturn.input_mode
      ? formatMwrContractLabel(moneyWeightedReturn.input_mode)
      : null,
    annualizedLabel:
      moneyWeightedReturn.annualized_return_pct != null
        ? formatPct(moneyWeightedReturn.annualized_return_pct)
        : null,
    holdingPeriodLabel:
      moneyWeightedReturn.holding_period_return_pct != null
        ? formatPct(moneyWeightedReturn.holding_period_return_pct)
        : null,
    approximationLabel:
      moneyWeightedReturn.is_approximation == null
        ? null
        : moneyWeightedReturn.is_approximation
          ? "Approximation"
          : "Exact method result",
    fallbackLabel,
    reasonCodes,
    warnings,
    notes,
  };
}

export default function PerformanceMwrDrilldown({
  model,
}: {
  model: PerformanceMwrDrilldownModel;
}) {
  const facts = [
    { label: "Status", value: model.statusLabel },
    { label: "Method", value: model.methodLabel },
    { label: "Input mode", value: model.inputModeLabel },
    { label: "Annualised", value: model.annualizedLabel },
    { label: "Holding period", value: model.holdingPeriodLabel },
    { label: "Approximation", value: model.approximationLabel },
    { label: "Fallback", value: model.fallbackLabel },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <details
      className="performance-mwr-drilldown"
      aria-label="Money-weighted return method evidence"
    >
      <summary>
        <span>{PERFORMANCE_RETURN_LABELS.moneyWeightedReturn} evidence</span>
        <strong>{model.summaryLabel}</strong>
      </summary>
      <div className="performance-mwr-drilldown-body">
        {facts.length > 0 ? (
          <dl className="performance-mwr-drilldown-facts">
            {facts.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <ReasonCodeList title="Reason codes" values={model.reasonCodes} />
        <ReasonCodeList title="Warnings" values={model.warnings} />
        <ReasonCodeList title="Notes" values={model.notes} />
      </div>
    </details>
  );
}

function ReasonCodeList({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) {
    return null;
  }

  return (
    <section
      className="performance-mwr-reason-group"
      aria-label={`Money-weighted return ${title.toLowerCase()}`}
    >
      <h4>{title}</h4>
      <ul>
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </section>
  );
}

function normalizeTextArray(values?: string[] | null): string[] {
  return Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function normalizeText(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildFallbackLabel(moneyWeightedReturn: MoneyWeightedReturnSummary): string | null {
  const from = normalizeText(moneyWeightedReturn.fallback_from);
  const reason = normalizeText(moneyWeightedReturn.fallback_reason);

  if (!from && !reason) {
    return null;
  }

  if (from && reason) {
    return `${formatMwrMethodLabel(from)}: ${reason}`;
  }

  return from ? formatMwrMethodLabel(from) : reason;
}

function formatMwrMethodLabel(value: string): string {
  return value === value.toUpperCase() && !value.includes("_") ? value : formatMwrContractLabel(value);
}

function formatMwrContractLabel(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part === "XIRR" || part === "MWR") {
        return part;
      }
      const lowered = part.toLowerCase();
      return lowered.charAt(0).toUpperCase() + lowered.slice(1);
    })
    .join(" ");
}
