import type { DpmCommandCenterPanelState } from "@/features/workbench/dpm-command-center-view-model";
import type { DpmAiWorkflowExecution } from "@/features/workbench/dpm-ai-workflow-contract";

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

export function readDpmWorkflowPackStatus(data: DpmAiWorkflowExecution | undefined): string {
  if (!data) {
    return "NOT_REQUESTED";
  }
  return data.workflow_pack_run.review_state ?? data.execution.status;
}
