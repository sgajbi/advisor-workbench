export const PROPOSAL_STAGES = [
  "DRAFT",
  "RISK_REVIEW",
  "COMPLIANCE_REVIEW",
  "AWAITING_CLIENT_CONSENT",
  "EXECUTION_READY",
] as const;

export type ProposalStage = (typeof PROPOSAL_STAGES)[number];

export function buildProposalActionIdempotencyKey(
  proposalId: string,
  action: string,
): string {
  return `ui-${action}-${proposalId}-${Date.now()}`;
}

export function proposalStageLabel(state: string): string {
  return state.replaceAll("_", " ");
}

export function proposalNextAction(state: string): string {
  if (state === "DRAFT") {
    return "Submit for risk or compliance review";
  }
  if (state === "RISK_REVIEW") {
    return "Risk officer approval needed";
  }
  if (state === "COMPLIANCE_REVIEW") {
    return "Compliance approval needed";
  }
  if (state === "AWAITING_CLIENT_CONSENT") {
    return "Record client consent";
  }
  if (state === "EXECUTION_READY") {
    return "Ready for execution handoff";
  }
  return "Pending workflow action";
}

export function proposalStageTone(state: string): "default" | "warn" | "success" {
  if (state === "EXECUTION_READY") {
    return "success";
  }
  if (state === "DRAFT") {
    return "default";
  }
  return "warn";
}

export function proposalStageOrder(state: string): number {
  if (state === "DRAFT") {
    return 1;
  }
  if (state === "RISK_REVIEW" || state === "COMPLIANCE_REVIEW") {
    return 2;
  }
  if (state === "AWAITING_CLIENT_CONSENT") {
    return 3;
  }
  if (state === "EXECUTION_READY") {
    return 4;
  }
  return 0;
}

export function proposalStageDescription(state: string): string {
  if (state === "DRAFT") {
    return "Advisor draft is ready for review submission.";
  }
  if (state === "RISK_REVIEW") {
    return "Risk team review is currently pending.";
  }
  if (state === "COMPLIANCE_REVIEW") {
    return "Compliance team review is currently pending.";
  }
  if (state === "AWAITING_CLIENT_CONSENT") {
    return "Client consent is required before execution.";
  }
  if (state === "EXECUTION_READY") {
    return "Proposal has cleared all gates and is ready for execution.";
  }
  return "Workflow state is not mapped yet.";
}

export function isValidProposalId(proposalId: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(proposalId);
}
