import { formatCalendarDateValue } from "@/design-system/utils/financial-formatters";
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
): string {
  if (!row || row.state === "N/A") {
    return "Not available";
  }
  return businessStateLabel(row.state);
}

export function mandateHealthScoreToPercent(
  score: string | undefined,
): number | null {
  if (!score) {
    return null;
  }
  const numeric = Number.parseFloat(score.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric > 1 ? numeric : numeric * 100;
}

export function clampMandateHealthPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function formatMandateHealthDisplayDate(value: string): string {
  return formatCalendarDateValue(value, { nullDisplay: "Not confirmed" });
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
    return "Not provided by mandate monitoring";
  }
  const normalized = value.toUpperCase();
  if (normalized.includes("REPAIR_SOURCE_DATA") || normalized.includes("REQUEST_SOURCE_REFRESH")) {
    return "Resolve data readiness";
  }
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
  if (normalized.includes("REQUEST REFRESH")) {
    return "Request data refresh";
  }
  if (value.toLowerCase().includes("evidence")) {
    return "Review supporting evidence";
  }
  return businessStateLabel(value);
}
