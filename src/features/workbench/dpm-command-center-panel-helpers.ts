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

export function readDpmWorkflowPackStatus(data: Record<string, unknown> | undefined): string {
  if (!data) {
    return "NOT_REQUESTED";
  }
  const workflowPackRun = readRecord(data.workflow_pack_run);
  const output = readRecord(data.output);
  return (
    readString(data.status) ??
    readString(data.review_state) ??
    readString(workflowPackRun.review_state) ??
    readString(output.review_state) ??
    "REVIEW_REQUIRED"
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
