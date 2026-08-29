import { formatTimestampValue } from "@/design-system/utils/financial-formatters";
import { ADVISORY_OVERVIEW_COPY } from "@/copy/advisory-overview-copy";

import type { AdvisoryJourneyReviewContext } from "./advisory-journey-navigation";
import {
  proposalNextAction,
  proposalStageLabel,
  proposalStageTone,
} from "./proposal-workflow-copy";
import type { ProposalSummary } from "./types";
import { buildProposalDetailHref } from "./proposal-lifecycle-workspace-view-model";

export type AdvisoryOverviewProposalRow = {
  proposalId: string;
  sourceState: string;
  title: string;
  status: string;
  statusTone: "default" | "warn" | "success";
  nextAction: string;
  createdBy: string;
  recordedAt: string;
  href: string;
};

export type AdvisoryOverviewModel = {
  portfolioId: string;
  primaryDecision: string;
  recommendedAction: string;
  proposalRows: AdvisoryOverviewProposalRow[];
  visibleProposalCount: number;
  attentionCount: number;
  hasPartialWindow: boolean;
  sourceWindowLabel: string;
  sourceWindowDetail: string;
};

function countByState(items: ProposalSummary[], states: string[]): number {
  return items.filter((item) => states.includes(item.current_state)).length;
}

function proposalAttentionPriority(state: string): number {
  if (state === "RISK_REVIEW" || state === "COMPLIANCE_REVIEW") {
    return 5;
  }
  if (state === "AWAITING_CLIENT_CONSENT") {
    return 4;
  }
  if (state === "DRAFT") {
    return 3;
  }
  if (state === "EXECUTION_READY") {
    return 2;
  }
  return 1;
}

function proposalDecisionStatus(state: string): string {
  if (state === "RISK_REVIEW") return "Risk review required";
  if (state === "COMPLIANCE_REVIEW") return "Compliance review required";
  if (state === "AWAITING_CLIENT_CONSENT") return "Client decision pending";
  if (state === "EXECUTION_READY") return "Implementation ready";
  if (state === "DRAFT") return "Adviser draft";
  return proposalStageLabel(state);
}

function recommendedAction(items: ProposalSummary[]): string {
  if (countByState(items, ["RISK_REVIEW", "COMPLIANCE_REVIEW"]) > 0) {
    return "Resolve review blockers before preparing any client discussion material.";
  }
  if (countByState(items, ["AWAITING_CLIENT_CONSENT"]) > 0) {
    return "Prepare the client discussion and record consent only after the meeting.";
  }
  if (countByState(items, ["EXECUTION_READY"]) > 0) {
    return "Follow implementation status and confirm execution handoff evidence.";
  }
  if (items.length > 0) {
    return "Submit ready adviser drafts for risk or compliance review.";
  }
  return ADVISORY_OVERVIEW_COPY.emptyDetail;
}

export function buildAdvisoryOverviewModel({
  reviewContext,
  proposals,
  hasMoreResults = false,
  hasPreviousResults = false,
  windowNumber = 1,
}: {
  reviewContext: AdvisoryJourneyReviewContext;
  proposals: ProposalSummary[];
  hasMoreResults?: boolean;
  hasPreviousResults?: boolean;
  windowNumber?: number;
}): AdvisoryOverviewModel {
  const {
    portfolioId,
    selectedRecordId: _selectedRecordId,
    batchId: _batchId,
    ...workspaceContext
  } = reviewContext;
  const hasPartialWindow = hasMoreResults || hasPreviousResults;

  const proposalRows = [...proposals]
    .sort(
      (left, right) =>
        proposalAttentionPriority(right.current_state) -
        proposalAttentionPriority(left.current_state),
    )
    .map((proposal) => ({
      proposalId: proposal.proposal_id,
      sourceState: proposal.current_state,
      title: proposal.title || proposal.proposal_id,
      status: proposalDecisionStatus(proposal.current_state),
      statusTone: proposalStageTone(proposal.current_state),
      nextAction: proposalNextAction(proposal.current_state),
      createdBy: proposal.created_by?.trim() || "Not reported",
      recordedAt: formatTimestampValue(proposal.created_at, {
        nullDisplay: "Not reported",
      }),
      href: buildProposalDetailHref({
        proposalId: proposal.proposal_id,
        reviewContext: { portfolioId, ...workspaceContext },
        fromMode: "overview",
      }),
    }));

  return {
    portfolioId,
    primaryDecision:
      "Which advisory item needs the relationship manager's attention first?",
    recommendedAction: recommendedAction(proposals),
    proposalRows,
    visibleProposalCount: proposals.length,
    attentionCount: proposalRows.length,
    hasPartialWindow,
    sourceWindowLabel: hasPartialWindow
      ? `Proposal window ${windowNumber}`
      : "Complete source window",
    sourceWindowDetail: hasPartialWindow
      ? "Counts and ranking apply only to proposals visible in this source window. Review adjacent windows before concluding the portfolio is clear."
      : "Counts and ranking cover all proposals returned for the selected portfolio.",
  };
}
