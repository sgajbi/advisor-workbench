import { buildAdvisoryJourneyHref } from "./advisory-journey-navigation";
import {
  proposalNextAction,
  proposalReadinessLabel,
  proposalStageLabel,
  proposalReadinessTone,
  proposalStageTone,
} from "./proposal-workflow-copy";
import type { ProposalSummary } from "./types";

export type AdvisoryOverviewMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "default" | "warn" | "success";
};

export type AdvisoryOverviewLifecycleStage = {
  key: "identify" | "construct" | "deliver" | "implement";
  sequence: string;
  label: string;
  detail: string;
  value: string;
  valueLabel: string;
  tone: "default" | "warn" | "success";
  href: string;
};

export type AdvisoryOverviewProposalRow = {
  proposalId: string;
  title: string;
  portfolio: string;
  stage: string;
  stageTone: "default" | "warn" | "success";
  readiness: string;
  readinessTone: "default" | "warn" | "success";
  nextAction: string;
  href: string;
};

export type AdvisoryOverviewModel = {
  portfolioId: string;
  primaryDecision: string;
  recommendedAction: string;
  metrics: AdvisoryOverviewMetric[];
  lifecycleStages: AdvisoryOverviewLifecycleStage[];
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
    return "Submit ready advisor drafts for risk or compliance review.";
  }
  return "Review source-backed ideas or build a proposal when a client objective is ready.";
}

export function buildAdvisoryOverviewModel({
  portfolioId,
  proposals,
  hasMoreResults = false,
  hasPreviousResults = false,
  windowNumber = 1,
}: {
  portfolioId: string;
  proposals: ProposalSummary[];
  hasMoreResults?: boolean;
  hasPreviousResults?: boolean;
  windowNumber?: number;
}): AdvisoryOverviewModel {
  const reviewBlockers = countByState(proposals, ["RISK_REVIEW", "COMPLIANCE_REVIEW"]);
  const awaitingClient = countByState(proposals, ["AWAITING_CLIENT_CONSENT"]);
  const executionReady = countByState(proposals, ["EXECUTION_READY"]);
  const drafts = countByState(proposals, ["DRAFT"]);
  const deliverCount = reviewBlockers + awaitingClient;
  const hasPartialWindow = hasMoreResults || hasPreviousResults;

  const proposalRows = [...proposals]
    .sort(
      (left, right) =>
        proposalAttentionPriority(right.current_state) -
        proposalAttentionPriority(left.current_state)
    )
    .map((proposal) => ({
      proposalId: proposal.proposal_id,
      title: proposal.title || proposal.proposal_id,
      portfolio: proposal.portfolio_id ?? "Not reported",
      stage: proposalStageLabel(proposal.current_state),
      stageTone: proposalStageTone(proposal.current_state),
      readiness: proposalReadinessLabel(proposal.current_state),
      readinessTone: proposalReadinessTone(proposal.current_state),
      nextAction: proposalNextAction(proposal.current_state),
      href: `/proposals/${proposal.proposal_id}`,
    }));

  return {
    portfolioId,
    primaryDecision: "Which advisory item needs the relationship manager's attention first?",
    recommendedAction: recommendedAction(proposals),
    metrics: [
      {
        label: "Visible Proposals",
        value: String(proposals.length),
        detail: hasPartialWindow
          ? `Current source window ${windowNumber}; additional proposals may sit outside this view.`
          : "All proposals returned for the selected portfolio.",
        tone: proposals.length > 0 ? "default" : "success",
      },
      {
        label: "Review Blockers",
        value: String(reviewBlockers),
        detail: "Risk or compliance items visible in this source window.",
        tone: reviewBlockers > 0 ? "warn" : "success",
      },
      {
        label: "Client Discussion",
        value: String(awaitingClient),
        detail: "Visible proposals waiting for client consent or discussion.",
        tone: awaitingClient > 0 ? "warn" : "default",
      },
      {
        label: "Implementation",
        value: String(executionReady),
        detail: "Visible proposals ready for execution follow-up.",
        tone: executionReady > 0 ? "success" : "default",
      },
    ],
    lifecycleStages: [
      {
        key: "identify",
        sequence: "01",
        label: "Identify",
        detail: "Review source-backed opportunities before starting a proposal.",
        value: "Ideas",
        valueLabel: "Upstream workspace",
        tone: "default",
        href: buildAdvisoryJourneyHref(portfolioId, "opportunities"),
      },
      {
        key: "construct",
        sequence: "02",
        label: "Construct",
        detail: "Shape the recommendation and prepare it for review.",
        value: String(drafts),
        valueLabel: drafts === 1 ? "visible draft" : "visible drafts",
        tone: drafts > 0 ? "default" : "success",
        href: buildAdvisoryJourneyHref(portfolioId, "proposal-builder"),
      },
      {
        key: "deliver",
        sequence: "03",
        label: "Review & discuss",
        detail: "Clear control reviews and prepare the client discussion.",
        value: String(deliverCount),
        valueLabel: deliverCount === 1 ? "visible handoff" : "visible handoffs",
        tone: deliverCount > 0 ? "warn" : "success",
        href: buildAdvisoryJourneyHref(portfolioId, "approval-queue"),
      },
      {
        key: "implement",
        sequence: "04",
        label: "Implement",
        detail: "Track approved recommendations through execution follow-up.",
        value: String(executionReady),
        valueLabel: executionReady === 1 ? "visible handoff" : "visible handoffs",
        tone: executionReady > 0 ? "success" : "default",
        href: buildAdvisoryJourneyHref(portfolioId, "implementation"),
      },
    ],
    proposalRows,
    visibleProposalCount: proposals.length,
    attentionCount: proposalRows.filter((row) => row.readiness !== "Ready").length,
    hasPartialWindow,
    sourceWindowLabel: hasPartialWindow
      ? `Proposal window ${windowNumber}`
      : "Complete source window",
    sourceWindowDetail: hasPartialWindow
      ? "Counts and ranking apply only to proposals visible in this source window. Review adjacent windows before concluding the portfolio is clear."
      : "Counts and ranking cover all proposals returned for the selected portfolio.",
  };
}
