import type { DpmCommandCenterPanelState } from "@/features/workbench/dpm-command-center-view-model";

export type DpmCommandCenterBadgeTone = "default" | "success" | "warn" | "danger";

export type DpmCommandCenterStatePanelCopy = {
  kind: "empty" | "partial" | "unavailable";
  title: string;
  body: string;
};

export function dpmCommandCenterBadgeTone(state: string): DpmCommandCenterBadgeTone {
  const normalized = state.toUpperCase();
  if (normalized === "COMPLETE" || normalized === "READY" || normalized === "SUCCEEDED") {
    return "success";
  }
  if (normalized === "PARTIAL" || normalized === "EMPTY" || normalized.includes("REVIEW")) {
    return "warn";
  }
  if (normalized === "BLOCKED" || normalized === "UNSUPPORTED" || normalized === "FAILED") {
    return "danger";
  }
  return "default";
}

export function dpmCommandCenterStatePanelCopy(
  state: DpmCommandCenterPanelState
): DpmCommandCenterStatePanelCopy {
  if (state === "empty") {
    return {
      kind: "empty",
      title: "No monitoring run for this PM book",
      body: "Run monitoring to request a fresh mandate assessment.",
    };
  }
  if (state === "partial") {
    return {
      kind: "partial",
      title: "Mandate readiness is partial",
      body: "Some data readiness or mandate-review inputs need attention.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable",
      title: "Command center is not supported",
      body: "Mandate health is not available for this context.",
    };
  }
  return {
    kind: "partial",
    title: "Mandate health is unavailable",
    body: "Mandate health is temporarily unavailable.",
  };
}

export function shouldShowDpmCommandCenterStatePanel(
  state: DpmCommandCenterPanelState,
  errorMessage?: string | null,
  runError?: string | null
): boolean {
  return (
    Boolean(errorMessage) ||
    Boolean(runError) ||
    state === "empty" ||
    state === "partial" ||
    state === "unsupported" ||
    state === "unavailable"
  );
}

export function readDpmWorkflowPackStatus(data: unknown): string {
  if (data === undefined) {
    return "NOT_REQUESTED";
  }
  const record = readRecord(data);
  const workflowPack = readRecord(record?.workflow_pack_run);
  if (!record || !workflowPack) {
    return "UNAVAILABLE";
  }
  return (
    readString(workflowPack.review_state) ??
    readString(readRecord(record.execution)?.status) ??
    "UNAVAILABLE"
  );
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
