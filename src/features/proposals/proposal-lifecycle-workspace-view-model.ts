import { PROPOSAL_DISCUSSION_PACK_COPY } from "@/copy/proposal-discussion-pack-copy";
import { PROPOSAL_IMPLEMENTATION_COPY } from "@/copy/proposal-implementation-copy";
import { formatDateValue } from "@/design-system/utils/financial-formatters";
import {
  buildReviewContextHref,
  type WorkspaceReviewContext,
} from "@/shell/review-context";

import type { AdvisoryJourneyMode } from "./advisory-journey-navigation";
import {
  proposalNextAction,
  proposalReadinessLabel,
  proposalReadinessTone,
  proposalStageDescription,
  proposalStageLabel,
  proposalStageTone,
} from "./proposal-workflow-copy";
import { SUITABILITY_WORKFLOW_LABELS } from "./suitability-terminology";
import type { ProposalSummary } from "./types";
import {
  buildProposalSourceWindowHref,
  type ProposalSourceWindowContext,
} from "./proposal-source-window-navigation";

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
      "Create a proposal draft when a client objective is ready for review.",
  },
  suitability: {
    title: SUITABILITY_WORKFLOW_LABELS.review,
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
    title: PROPOSAL_DISCUSSION_PACK_COPY.navigation.title,
    subtitle: PROPOSAL_DISCUSSION_PACK_COPY.navigation.description,
    primaryDecision: PROPOSAL_DISCUSSION_PACK_COPY.navigation.primaryDecision,
    recommendedAction: PROPOSAL_DISCUSSION_PACK_COPY.navigation.nextAction,
    emptyTitle: PROPOSAL_DISCUSSION_PACK_COPY.emptyTitle,
    emptyBody: PROPOSAL_DISCUSSION_PACK_COPY.emptyBody,
    includedStates: ["AWAITING_CLIENT_CONSENT"],
  },
  implementation: {
    title: "Implementation Status",
    subtitle: PROPOSAL_IMPLEMENTATION_COPY.workspaceSubtitle,
    primaryDecision: PROPOSAL_IMPLEMENTATION_COPY.primaryDecision,
    recommendedAction: PROPOSAL_IMPLEMENTATION_COPY.recommendedAction,
    emptyTitle: PROPOSAL_IMPLEMENTATION_COPY.emptyTitle,
    emptyBody: PROPOSAL_IMPLEMENTATION_COPY.emptyBody,
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
  reviewContext,
  mode,
  proposals,
  hasMoreResults = false,
  hasPreviousResults = false,
  sourceWindow,
}: {
  portfolioId: string;
  reviewContext?: WorkspaceReviewContext;
  mode: ProposalLifecycleMode;
  proposals: ProposalSummary[];
  hasMoreResults?: boolean;
  hasPreviousResults?: boolean;
  sourceWindow?: ProposalSourceWindowContext;
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
      reviewContext: { ...reviewContext, portfolioId },
      fromMode: mode,
      sourceWindow,
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
  reviewContext,
  portfolioId,
  fromMode,
  sourceWindow,
}: {
  proposalId: string;
  reviewContext?: WorkspaceReviewContext;
  portfolioId?: string;
  fromMode: ProposalLifecycleMode | "overview";
  sourceWindow?: ProposalSourceWindowContext;
}): string {
  const href = buildReviewContextHref(
    `/proposals/${encodeURIComponent(proposalId)}?fromMode=${encodeURIComponent(fromMode)}`,
    reviewContext ?? (portfolioId ? { portfolioId } : {}),
  );
  return sourceWindow
    ? buildProposalSourceWindowHref(href, sourceWindow)
    : href;
}

export function buildProposalLifecycleHref({
  portfolioId,
  reviewContext,
  mode,
  sourceWindow,
}: {
  portfolioId: string;
  reviewContext?: WorkspaceReviewContext;
  mode: ProposalLifecycleMode;
  sourceWindow?: ProposalSourceWindowContext;
}): string {
  const href = mode === "approval-queue" ? "/proposals" : `/proposals?mode=${mode}`;
  const contextualHref = buildReviewContextHref(href, {
    ...reviewContext,
    portfolioId,
  });
  return sourceWindow
    ? buildProposalSourceWindowHref(contextualHref, sourceWindow)
    : contextualHref;
}
