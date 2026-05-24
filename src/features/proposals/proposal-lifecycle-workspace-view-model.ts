import type { AdvisoryJourneyMode } from "./advisory-journey-navigation";
import {
  proposalNextAction,
  proposalReadinessLabel,
  proposalReadinessTone,
  proposalStageDescription,
  proposalStageLabel,
  proposalStageTone,
} from "./proposal-workflow-copy";
import type { ProposalSummary } from "./types";

export type ProposalLifecycleMode =
  | "approval-queue"
  | "suitability"
  | "risk-impact"
  | "discussion-pack"
  | "implementation";

export type ProposalLifecycleRow = {
  proposalId: string;
  title: string;
  portfolio: string;
  stage: string;
  stageTone: "default" | "warn" | "success";
  readiness: string;
  readinessTone: "default" | "warn" | "success";
  nextAction: string;
  posture: string;
  href: string;
};

export type ProposalLifecycleModel = {
  mode: ProposalLifecycleMode;
  title: string;
  subtitle: string;
  primaryDecision: string;
  recommendedAction: string;
  emptyTitle: string;
  emptyBody: string;
  totalCount: number;
  attentionCount: number;
  rows: ProposalLifecycleRow[];
};

type ModeDefinition = {
  title: string;
  subtitle: string;
  primaryDecision: string;
  recommendedAction: string;
  emptyTitle: string;
  emptyBody: string;
  includedStates?: string[];
};

const MODE_DEFINITIONS: Record<ProposalLifecycleMode, ModeDefinition> = {
  "approval-queue": {
    title: "Approval Queue",
    subtitle: "Proposal drafts, maker-checker posture, and advisor-ready next actions.",
    primaryDecision: "Which proposal needs maker-checker action first?",
    recommendedAction: "Clear risk, compliance, and client-consent blockers before execution handoff.",
    emptyTitle: "No proposals in the approval queue",
    emptyBody: "Create an advisor-use draft when a client objective is ready for review.",
  },
  suitability: {
    title: "Suitability Review",
    subtitle: "Mandate, suitability, disclosure, and blocking-issue review.",
    primaryDecision: "Can the proposal proceed under documented client and product constraints?",
    recommendedAction: "Resolve suitability and compliance blockers before client discussion.",
    emptyTitle: "No suitability items need review",
    emptyBody: "There are no proposals currently waiting at risk or compliance review gates.",
    includedStates: ["RISK_REVIEW", "COMPLIANCE_REVIEW"],
  },
  "risk-impact": {
    title: "Risk And Impact",
    subtitle: "Risk-review posture for proposals requiring concentration or allocation evidence.",
    primaryDecision: "Is the risk and portfolio-impact trade-off acceptable?",
    recommendedAction: "Open risk-review items and attach source-owned risk evidence before approval.",
    emptyTitle: "No risk-impact reviews are pending",
    emptyBody: "There are no proposals currently waiting for risk review.",
    includedStates: ["RISK_REVIEW"],
  },
  "discussion-pack": {
    title: "Client Discussion Pack",
    subtitle: "Advisor-reviewed rationale and client-consent readiness.",
    primaryDecision: "Is the proposal ready to discuss with the client?",
    recommendedAction: "Prepare the client discussion pack and record consent after the meeting.",
    emptyTitle: "No client discussion packs are pending",
    emptyBody: "There are no proposals currently waiting for client consent.",
    includedStates: ["AWAITING_CLIENT_CONSENT"],
  },
  implementation: {
    title: "Implementation Status",
    subtitle: "Execution handoff, implementation status, and post-trade follow-up.",
    primaryDecision: "Has the approved proposal been implemented as intended?",
    recommendedAction: "Track execution handoff evidence and follow up exceptions.",
    emptyTitle: "No implementation follow-up is pending",
    emptyBody: "There are no proposals currently ready for execution handoff.",
    includedStates: ["EXECUTION_READY"],
  },
};

export function normalizeProposalLifecycleMode(mode: AdvisoryJourneyMode): ProposalLifecycleMode {
  if (
    mode === "suitability" ||
    mode === "risk-impact" ||
    mode === "discussion-pack" ||
    mode === "implementation"
  ) {
    return mode;
  }
  return "approval-queue";
}

export function getProposalLifecycleModeDefinition(mode: ProposalLifecycleMode): ModeDefinition {
  return MODE_DEFINITIONS[mode];
}

function filterByMode(proposals: ProposalSummary[], mode: ProposalLifecycleMode): ProposalSummary[] {
  const includedStates = MODE_DEFINITIONS[mode].includedStates;
  if (!includedStates) {
    return proposals;
  }
  return proposals.filter((proposal) => includedStates.includes(proposal.current_state));
}

function attentionCount(rows: ProposalLifecycleRow[]): number {
  return rows.filter((row) => row.readiness !== "Ready").length;
}

export function buildProposalLifecycleWorkspaceModel({
  mode,
  proposals,
}: {
  mode: ProposalLifecycleMode;
  proposals: ProposalSummary[];
}): ProposalLifecycleModel {
  const definition = MODE_DEFINITIONS[mode];
  const rows = filterByMode(proposals, mode).map((proposal) => ({
    proposalId: proposal.proposal_id,
    title: proposal.title || proposal.proposal_id,
    portfolio: proposal.portfolio_id ?? "Not reported",
    stage: proposalStageLabel(proposal.current_state),
    stageTone: proposalStageTone(proposal.current_state),
    readiness: proposalReadinessLabel(proposal.current_state),
    readinessTone: proposalReadinessTone(proposal.current_state),
    nextAction: proposalNextAction(proposal.current_state),
    posture: proposalStageDescription(proposal.current_state),
    href: `/proposals/${proposal.proposal_id}`,
  }));

  return {
    mode,
    ...definition,
    totalCount: rows.length,
    attentionCount: attentionCount(rows),
    rows,
  };
}
