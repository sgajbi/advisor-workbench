import type { AdvisoryJourneyMode } from "./advisory-journey-navigation";
import { formatDateValue } from "@/design-system/utils/financial-formatters";
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
  currentState: string;
  title: string;
  portfolio: string;
  sourcePortfolioId: string | null;
  stage: string;
  stageTone: "default" | "warn" | "success";
  readiness: string;
  readinessTone: "default" | "warn" | "success";
  nextAction: string;
  posture: string;
  version: string;
  versionNo: number | null;
  creator: string;
  createdOn: string;
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
    subtitle:
      "Proposal drafts, review-stage posture, and source-supported next actions.",
    primaryDecision: "Which proposal requires review action first?",
    recommendedAction:
      "Open the proposal to verify approvals and supporting evidence before advancing it.",
    emptyTitle: "No proposals in the approval queue",
    emptyBody:
      "Create an advisor-use draft when a client objective is ready for review.",
  },
  suitability: {
    title: "Suitability Review",
    subtitle: "Mandate, suitability, disclosure, and blocking-issue review.",
    primaryDecision:
      "Can the proposal proceed under documented client and product constraints?",
    recommendedAction:
      "Resolve suitability and compliance blockers before client discussion.",
    emptyTitle: "No suitability items need review",
    emptyBody:
      "There are no proposals currently waiting at risk or compliance review gates.",
    includedStates: ["RISK_REVIEW", "COMPLIANCE_REVIEW"],
  },
  "risk-impact": {
    title: "Risk and Impact",
    subtitle:
      "Risk-review posture for proposals requiring concentration or allocation evidence.",
    primaryDecision: "Is the risk and portfolio-impact trade-off acceptable?",
    recommendedAction:
      "Open risk-review items and attach source-owned risk evidence before approval.",
    emptyTitle: "No risk-impact reviews are pending",
    emptyBody: "There are no proposals currently waiting for risk review.",
    includedStates: ["RISK_REVIEW"],
  },
  "discussion-pack": {
    title: "Discussion Pack Review",
    subtitle:
      "Advisor-reviewed rationale, evidence, and client-consent gate posture.",
    primaryDecision:
      "What evidence or review remains before client discussion?",
    recommendedAction:
      "Resolve policy, memo, narrative, and consent blockers before using the pack.",
    emptyTitle: "No discussion-pack reviews are pending",
    emptyBody:
      "There are no proposals currently waiting at the client-consent gate.",
    includedStates: ["AWAITING_CLIENT_CONSENT"],
  },
  implementation: {
    title: "Implementation Status",
    subtitle:
      "Implementation handoff, provider response, exceptions, and proposal-version correlation.",
    primaryDecision:
      "What is the latest source-confirmed implementation posture?",
    recommendedAction:
      "Follow provider exceptions without inferring order, fill, or settlement progress.",
    emptyTitle: "No implementation records in this source window",
    emptyBody:
      "There are no proposals currently in handoff, completion, or exception follow-up.",
    includedStates: [
      "EXECUTION_READY",
      "EXECUTED",
      "REJECTED",
      "CANCELLED",
      "EXPIRED",
    ],
  },
};

export function normalizeProposalLifecycleMode(
  mode: AdvisoryJourneyMode,
): ProposalLifecycleMode {
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

export function getProposalLifecycleModeDefinition(
  mode: ProposalLifecycleMode,
): ModeDefinition {
  return MODE_DEFINITIONS[mode];
}

function filterByMode(
  proposals: ProposalSummary[],
  mode: ProposalLifecycleMode,
): ProposalSummary[] {
  const includedStates = MODE_DEFINITIONS[mode].includedStates;
  if (!includedStates) {
    return proposals;
  }
  return proposals.filter((proposal) =>
    includedStates.includes(proposal.current_state),
  );
}

function attentionCount(rows: ProposalLifecycleRow[]): number {
  return rows.filter((row) => row.readiness !== "Ready").length;
}

export function buildProposalLifecycleWorkspaceModel({
  portfolioId,
  mode,
  proposals,
  hasMoreResults = false,
  hasPreviousResults = false,
}: {
  portfolioId: string;
  mode: ProposalLifecycleMode;
  proposals: ProposalSummary[];
  hasMoreResults?: boolean;
  hasPreviousResults?: boolean;
}): ProposalLifecycleModel {
  const definition = MODE_DEFINITIONS[mode];
  const rows = filterByMode(proposals, mode).map((proposal) => ({
    proposalId: proposal.proposal_id,
    currentState: proposal.current_state,
    title: proposal.title || proposal.proposal_id,
    portfolio: proposal.portfolio_id ?? "Not reported",
    sourcePortfolioId: proposal.portfolio_id ?? null,
    stage: proposalStageLabel(proposal.current_state),
    stageTone: proposalStageTone(proposal.current_state),
    readiness: proposalReadinessLabel(proposal.current_state),
    readinessTone: proposalReadinessTone(proposal.current_state),
    nextAction: proposalNextAction(proposal.current_state),
    posture:
      proposal.current_state === "EXECUTION_READY"
        ? "Source lifecycle marks this proposal ready for execution handoff."
        : proposalStageDescription(proposal.current_state),
    version:
      typeof proposal.current_version_no === "number"
        ? `Version ${proposal.current_version_no}`
        : "Version not reported",
    versionNo:
      typeof proposal.current_version_no === "number"
        ? proposal.current_version_no
        : null,
    creator: proposal.created_by?.trim()
      ? "Recorded by source"
      : "Not reported",
    createdOn: formatDateValue(proposal.created_at, {
      nullDisplay: "Date not reported",
    }),
    href: buildProposalDetailHref({
      proposalId: proposal.proposal_id,
      portfolioId,
      fromMode: mode,
    }),
  }));

  const hasAdjacentResults = hasMoreResults || hasPreviousResults;
  const emptyPresentation =
    rows.length === 0 && hasAdjacentResults
      ? {
          emptyTitle: "No matching proposals in this view",
          emptyBody: hasMoreResults
            ? "No proposals match the selected queue in the proposals currently shown. Review the next proposals before concluding the queue is clear."
            : "No proposals match the selected queue in the proposals currently shown. Return to the previous proposals to continue the review.",
        }
      : {
          emptyTitle: definition.emptyTitle,
          emptyBody: definition.emptyBody,
        };

  return {
    mode,
    ...definition,
    ...emptyPresentation,
    totalCount: rows.length,
    attentionCount: attentionCount(rows),
    rows,
  };
}

export function buildProposalDetailHref({
  proposalId,
  portfolioId,
  fromMode,
}: {
  proposalId: string;
  portfolioId: string;
  fromMode: ProposalLifecycleMode;
}): string {
  const query = new URLSearchParams({ portfolioId, fromMode });
  return `/proposals/${encodeURIComponent(proposalId)}?${query.toString()}`;
}

export function buildProposalLifecycleHref({
  portfolioId,
  mode,
}: {
  portfolioId: string;
  mode: ProposalLifecycleMode;
}): string {
  const query = new URLSearchParams({ portfolioId });
  if (mode !== "approval-queue") query.set("mode", mode);
  return `/proposals?${query.toString()}`;
}
