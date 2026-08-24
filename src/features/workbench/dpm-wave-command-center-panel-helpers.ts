import { formatBusinessDateValue } from "@/design-system/utils/financial-formatters";
import type {
  DpmWaveItemRow,
  DpmWaveCommandCenterPanelState,
  DpmWaveMetricRow,
} from "./dpm-wave-command-center-view-model";
import {
  formatBusinessMandateType,
  formatBusinessReason,
  isBusinessValueAvailable,
} from "./manage-workspace-view-model";

export type DpmWaveMetricTile = {
  label: string;
  value: string;
  tone?: DpmWaveBadgeTone;
};

export type DpmWaveBadgeTone = "default" | "success" | "warn" | "danger";

export const DPM_WAVE_LIFECYCLE_STEPS = [
  "Preview",
  "Data Check",
  "Simulation",
  "Approval",
  "Staging",
] as const;

export type DpmWaveProposedChangeRow = {
  key: string;
  security: string;
  action: string;
  actionTone: "buy" | "sell" | "trim" | "default";
  estimatedValue: string;
  reason: string;
  mandateImpact: string;
  status: string;
};

export type DpmWaveStatePanelCopy = {
  kind: "empty" | "partial" | "permission_blocked" | "unavailable";
  title: string;
  body: string;
};

export type DpmWaveHeaderModel = {
  mandateLabel: string;
  currencyLabel: string;
  asOfLabel: string;
  proof: {
    label: string;
    tone: DpmWaveBadgeTone;
  };
};

export function resolveCampaignWorkflowEvidenceError({
  initialError,
  refreshError,
  refreshResolved,
}: {
  initialError?: string | null;
  refreshError?: string | null;
  refreshResolved: boolean;
}): string | null {
  return refreshResolved ? refreshError ?? null : refreshError ?? initialError ?? null;
}

export function buildDpmWaveHeaderModel({
  mandateType,
  portfolioCurrency,
  asOfDate,
  proofState,
}: {
  mandateType?: string | null;
  portfolioCurrency?: string | null;
  asOfDate?: string | null;
  proofState: string;
}): DpmWaveHeaderModel {
  return {
    mandateLabel: isBusinessValueAvailable(mandateType)
      ? formatBusinessMandateType(mandateType)
      : "Mandate not reported",
    currencyLabel: isBusinessValueAvailable(portfolioCurrency)
      ? String(portfolioCurrency).trim().toUpperCase()
      : "Currency not reported",
    asOfLabel: isBusinessValueAvailable(asOfDate)
      ? formatDpmWaveDisplayDate(String(asOfDate))
      : "As of not reported",
    proof: buildDpmWaveProofPosture(proofState),
  };
}

export function buildDpmWaveProofPosture(state: string): DpmWaveHeaderModel["proof"] {
  const normalized = state.trim().toUpperCase();
  if (["READY", "COMPLETE"].includes(normalized)) {
    return { label: "Evidence ready", tone: "success" };
  }
  if (normalized === "AVAILABLE") {
    return { label: "Evidence not opened", tone: "default" };
  }
  if (normalized === "NOT_REQUESTED") {
    return { label: "Evidence not requested", tone: "default" };
  }
  if (["PENDING", "IN_PROGRESS", "REQUESTED", "PREPARING"].includes(normalized)) {
    return { label: "Evidence being prepared", tone: "warn" };
  }
  if (["PARTIAL", "DEGRADED", "REVIEW_REQUIRED"].includes(normalized)) {
    return { label: "Evidence needs review", tone: "warn" };
  }
  if (normalized === "BLOCKED") {
    return { label: "Evidence blocked", tone: "danger" };
  }
  if (["FAILED", "ERROR", "UNAVAILABLE", "UNSUPPORTED", "CANCELLED"].includes(normalized)) {
    return { label: "Evidence unavailable", tone: "danger" };
  }
  return { label: "Evidence not reported", tone: "default" };
}

export function dpmWaveStatePanelCopy(
  state: DpmWaveCommandCenterPanelState,
  portfolioId: string
): DpmWaveStatePanelCopy {
  if (state === "empty") {
    return {
      kind: "empty",
      title: "No rebalance proposal is available",
      body: `No active rebalance proposal is available for ${portfolioId}.`,
    };
  }
  if (state === "partial") {
    return {
      kind: "partial",
      title: "Rebalance readiness is partial",
      body: "Some required inputs need review before approval can proceed.",
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked",
      title: "Approval is blocked",
      body: "Resolve the open attention items before requesting approval.",
    };
  }
  return {
    kind: "unavailable",
    title: "Rebalance data is temporarily unavailable",
    body: "Rebalance details could not be loaded.",
  };
}

export function buildDpmWaveMetricTiles(
  metricRows: DpmWaveMetricRow[],
  selectedWaveItemCount: string,
  selectedWaveIssueCount: string
): DpmWaveMetricTile[] {
  return [
    {
      label: "Turnover",
      value: findDpmWaveMetricValue(metricRows, ["turnover"], "Pending"),
    },
    {
      label: "Cash After",
      value: findDpmWaveMetricValue(metricRows, ["cash after", "cash_after", "cash"], "Pending"),
    },
    {
      label: "Est. Trades",
      value: findDpmWaveMetricValue(metricRows, ["trade count", "trades"], selectedWaveItemCount),
    },
    {
      label: "Issues",
      value: selectedWaveIssueCount,
      tone: selectedWaveIssueCount === "0" ? "success" : "danger",
    },
  ];
}

export function buildDpmWaveProposedChangeRows(
  itemRows: DpmWaveItemRow[]
): DpmWaveProposedChangeRow[] {
  return itemRows.map((row, index) => {
    const action = firstDpmWaveBusinessValue(row.proposedAction, "Review");
    return {
      key: row.key,
      security: firstDpmWaveBusinessValue(row.security, `Proposal item ${index + 1}`),
      action,
      actionTone: dpmWaveActionTone(action),
      estimatedValue: firstDpmWaveBusinessValue(row.estimatedValue, "Pending"),
      reason: firstDpmWaveBusinessValue(row.reason, formatBusinessReason(row.reasonCodes), "Requires review"),
      mandateImpact: firstDpmWaveBusinessValue(row.mandateImpact, "Review against mandate"),
      status: firstDpmWaveBusinessValue(row.status, row.state, "PENDING"),
    };
  });
}

export function firstDpmWaveBusinessValue(...values: Array<string | null | undefined>): string {
  return (
    values.find((value) => {
      const normalized = value?.trim();
      return normalized && !["N/A", "UNKNOWN", "NOT_REQUESTED"].includes(normalized.toUpperCase());
    }) ?? "Pending"
  );
}

export function dpmWaveActionTone(action: string): "buy" | "sell" | "trim" | "default" {
  const normalized = action.toLowerCase();
  if (normalized.includes("buy")) {
    return "buy";
  }
  if (normalized.includes("sell")) {
    return "sell";
  }
  if (normalized.includes("trim") || normalized.includes("reduce")) {
    return "trim";
  }
  return "default";
}

export function dpmWaveBadgeTone(state: string): DpmWaveBadgeTone {
  const normalized = state.toUpperCase();
  if (
    [
      "READY",
      "SUPPORTED",
      "COMPLETE",
      "HANDOFF_READY",
      "STAGED",
      "SIMULATION_READY",
      "SIMULATED",
      "SOURCE_CHECKED",
    ].includes(normalized)
  ) {
    return "success";
  }
  if (["DEGRADED", "PARTIAL", "DRAFT", "REVIEW_REQUIRED", "PENDING"].includes(normalized)) {
    return "warn";
  }
  if (["BLOCKED", "UNSUPPORTED", "FAILED", "CANCELLED"].includes(normalized)) {
    return "danger";
  }
  return "default";
}

export function findDpmWaveMetricValue(
  rows: DpmWaveMetricRow[],
  needles: string[],
  fallback: string
): string {
  const normalizedNeedles = needles.map((needle) => needle.toLowerCase());
  const row = rows.find((candidate) => {
    const key = `${candidate.key} ${candidate.label}`.replaceAll("_", " ").toLowerCase();
    return normalizedNeedles.some((needle) => key.includes(needle));
  });
  return firstDpmWaveBusinessValue(row?.value, fallback);
}

export function resolveDpmWaveLifecycleIndex(state: string): number {
  const normalized = state.toUpperCase();
  if (normalized.includes("STAG") || normalized.includes("HANDOFF")) {
    return 4;
  }
  if (normalized.includes("APPROV")) {
    return 3;
  }
  if (normalized.includes("SIMUL")) {
    return 2;
  }
  if (normalized.includes("SOURCE") || normalized.includes("DATA")) {
    return 1;
  }
  return 0;
}

export function isDpmWaveActionBlocked(blockedActions: string[], action: string): boolean {
  return blockedActions.some((blockedAction) =>
    blockedAction.toLowerCase().includes(action.toLowerCase())
  );
}

export function formatDpmWaveDisplayDate(value: string | undefined): string {
  const businessDate = formatBusinessDateValue(value, { nullDisplay: "" });
  return businessDate ? `As of ${businessDate}` : "As of not confirmed";
}
