import type {
  DpmWaveItemRow,
  DpmWaveCommandCenterPanelState,
  DpmWaveMetricRow,
} from "./dpm-wave-command-center-view-model";
import { formatBusinessReason } from "./manage-workspace-view-model";

export type DpmWaveMetricTile = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn" | "danger";
};

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
  if (!value || value === "N/A") {
    return "As of 03 May 2026";
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return `As of ${value}`;
  }
  return `As of ${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })}`;
}
