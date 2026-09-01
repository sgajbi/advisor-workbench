import { businessStateLabel } from "@/copy/business-state-copy";

import type { DpmAiWorkflowExecution } from "@/features/workbench/dpm-ai-workflow-contract";
import type { ProofPackPanelState } from "@/features/workbench/proof-pack-view-model";
import type { DpmProofPackGatewayResponse } from "@/features/workbench/types";

export type ProofPackBadgeTone = "default" | "success" | "warn" | "danger";

export type ProofPackStatePanelCopy = {
  kind: "empty" | "partial" | "permission_blocked" | "unavailable";
  title: string;
  body: string;
};

export function proofPackBadgeTone(state: string): ProofPackBadgeTone {
  const normalized = state.toUpperCase();
  if (normalized === "SUPPORTED" || normalized === "READY" || normalized === "COMPLETE") {
    return "success";
  }
  if (normalized === "DEGRADED" || normalized === "PARTIAL" || normalized.includes("PENDING")) {
    return "warn";
  }
  if (normalized === "BLOCKED" || normalized === "UNSUPPORTED" || normalized === "FAILED") {
    return "danger";
  }
  return "default";
}

export function proofPackSupportabilityLabel(state: string): string {
  const normalized = state.trim().toUpperCase();
  if (normalized === "PARTIAL") {
    return "Partially available";
  }
  if (normalized === "DEGRADED") {
    return "Degraded";
  }
  return businessStateLabel(normalized);
}

export function proofPackStatePanelCopy(
  state: ProofPackPanelState,
  portfolioId: string
): ProofPackStatePanelCopy {
  if (state === "empty") {
    return {
      kind: "empty",
      title: "No evidence pack linked to this portfolio",
      body: `No evidence pack is currently linked to ${portfolioId}.`,
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked",
      title: "Evidence handoff is blocked",
      body: "Resolve the open rebalance items before preparing decision evidence.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable",
      title: "Evidence pack is not supported",
      body: "Evidence preparation is not available for the current rebalance state.",
    };
  }
  return {
    kind: "partial",
    title: "Evidence pack is unavailable",
    body: "Evidence details are temporarily unavailable for this portfolio.",
  };
}

export function shouldShowProofPackStatePanel(
  state: ProofPackPanelState,
  errorMessage?: string | null
): boolean {
  return (
    Boolean(errorMessage) ||
    state === "empty" ||
    state === "blocked" ||
    state === "unsupported" ||
    state === "unavailable"
  );
}

export function proofPackAvailabilityLabel(available: boolean): string {
  return available ? "Available" : "Unavailable";
}

export function proofPackAvailabilityTone(value: string): ProofPackBadgeTone {
  const normalized = value.toUpperCase();
  if (normalized.includes("BLOCKED") || normalized.includes("UNAVAILABLE")) {
    return "danger";
  }
  if (normalized.includes("AVAILABLE") || normalized.includes("COMPLETE") || normalized.includes("READY")) {
    return "success";
  }
  if (normalized.includes("PENDING") || normalized.includes("REVIEW")) {
    return "warn";
  }
  return "default";
}

export function readProofPackMarkdown(
  response: DpmProofPackGatewayResponse & { markdown?: unknown }
): string {
  if (typeof response.markdown === "string") {
    return response.markdown;
  }
  if (typeof response.data.markdown === "string") {
    return response.data.markdown;
  }
  if (typeof response.data.content === "string") {
    return response.data.content;
  }
  return "No summary content is available for this evidence pack.";
}

export function readProofPackAiWorkflowPackStatus(data: DpmAiWorkflowExecution): string {
  return `${businessStateLabel(data.workflow_pack_run.review_state)}.`;
}
