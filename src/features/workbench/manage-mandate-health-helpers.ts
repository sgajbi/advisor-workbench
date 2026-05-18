import {
  businessStateLabel,
  formatBusinessExceptionTitle,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";

import type {
  MandateHealthRow,
  ManageExceptionRow,
} from "@/features/workbench/manage-workspace-view-model";

export function findMandateHealthRow(
  rows: MandateHealthRow[],
  needles: string[]
): MandateHealthRow | undefined {
  return rows.find((row) => {
    const haystack = `${row.key} ${row.dimension}`.toLowerCase();
    return needles.some((needle) => haystack.includes(needle));
  });
}

export function mandateHealthSummaryStateLabel(
  row: MandateHealthRow | undefined,
  fallback: string
): string {
  if (!row || row.state === "N/A") {
    return fallback;
  }
  if (row.state.toUpperCase() === "READY") {
    return fallback;
  }
  return businessStateLabel(row.state);
}

export function mandateHealthScoreToPercent(
  score: string | undefined,
  fallback: number
): number {
  if (!score) {
    return fallback;
  }
  const numeric = Number.parseFloat(score.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric > 1 ? numeric : numeric * 100;
}

export function clampMandateHealthPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function formatMandateHealthDisplayDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return value;
}

export function formatMandateHealthDimensionLabel(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("source") || normalized.includes("market")) {
    return "Market Data Readiness";
  }
  if (normalized.includes("allocation")) {
    return "Allocation Drift";
  }
  if (normalized.includes("risk")) {
    return "Risk Drift";
  }
  if (normalized.includes("cash")) {
    return "Cash Liquidity";
  }
  if (normalized.includes("tax")) {
    return "Tax And Turnover";
  }
  if (normalized.includes("eligibility")) {
    return "Eligibility Restrictions";
  }
  if (normalized.includes("performance")) {
    return "Performance Review";
  }
  if (normalized.includes("workflow")) {
    return "Review Readiness";
  }
  if (normalized.includes("cadence")) {
    return "Review Cadence";
  }
  if (normalized.includes("model")) {
    return "Model Freshness";
  }
  if (normalized.includes("constraint")) {
    return "Mandate Constraints";
  }
  return businessStateLabel(value);
}

export function formatMandateAttentionObservation(row: ManageExceptionRow): string {
  const text = `${row.title} ${row.nextAction}`.toUpperCase();
  if (text.includes("SUSTAINABILITY")) {
    return "Sustainability preferences require review";
  }
  if (text.includes("ALLOCATION")) {
    return "Allocation drift requires review";
  }
  if (text.includes("CASH")) {
    return "Cash weight above soft range";
  }
  return formatBusinessExceptionTitle(row.title);
}

export function formatMandateRecommendedDetail(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized.includes("SUSTAINABILITY")) {
    return "Confirm mandate-specific sustainability preferences before approval.";
  }
  if (normalized.includes("ALLOCATION")) {
    return "Review allocation drift before moving the rebalance forward.";
  }
  if (normalized.includes("CASH")) {
    return "Confirm tactical cash position remains within mandate tolerance.";
  }
  if (normalized.includes("ADVISOR")) {
    return value;
  }
  return businessStateLabel(value);
}

export function formatMandateHealthObservation(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized.includes("ALLOCATION")) {
    return "Allocation drift review";
  }
  if (normalized.includes("CASH")) {
    return "Cash range review";
  }
  if (normalized.includes("SUSTAINABILITY")) {
    return "Sustainability review";
  }
  if (normalized.includes("READY")) {
    return "No action required";
  }
  const reason = formatBusinessReason(value);
  return reason === "-" ? "No action required" : reason;
}

export function formatMandateAction(value: string): string {
  if (!value || value === "-" || value === "N/A") {
    return "No action required";
  }
  const normalized = value.toUpperCase();
  if (normalized.includes("SIMULATE_REBALANCE")) {
    return "Review rebalance simulation";
  }
  if (normalized.includes("REVIEW_WORKFLOW")) {
    return "Review mandate workflow";
  }
  if (normalized.includes("SUSTAINABILITY")) {
    return "Review sustainability preferences";
  }
  if (normalized.includes("ACKNOWLEDGE")) {
    return "Acknowledge";
  }
  if (value.toLowerCase().includes("evidence")) {
    return "Review supporting evidence";
  }
  return businessStateLabel(value);
}
