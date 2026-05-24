import {
  ADVISORY_JOURNEY_DEFINITIONS,
  buildAdvisoryJourneyHref,
  type AdvisoryJourneyMode,
} from "./advisory-journey-navigation";
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

export type AdvisoryOverviewJourneyCard = {
  key: AdvisoryJourneyMode;
  label: string;
  detail: string;
  decision: string;
  nextAction: string;
  href: string;
  countLabel: string;
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
  journeyCards: AdvisoryOverviewJourneyCard[];
  proposalRows: AdvisoryOverviewProposalRow[];
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

function journeyCount(items: ProposalSummary[], mode: AdvisoryJourneyMode): number | null {
  if (mode === "approval-queue") {
    return items.length;
  }
  if (mode === "suitability" || mode === "risk-impact") {
    return countByState(items, ["RISK_REVIEW", "COMPLIANCE_REVIEW"]);
  }
  if (mode === "discussion-pack") {
    return countByState(items, ["AWAITING_CLIENT_CONSENT"]);
  }
  if (mode === "implementation") {
    return countByState(items, ["EXECUTION_READY"]);
  }
  if (mode === "proposal-builder" || mode === "opportunities" || mode === "overview") {
    return null;
  }
  return null;
}

function recommendedAction(items: ProposalSummary[]): string {
  if (countByState(items, ["RISK_REVIEW", "COMPLIANCE_REVIEW"]) > 0) {
    return "Resolve review blockers before preparing any client discussion material.";
  }
  if (countByState(items, ["AWAITING_CLIENT_CONSENT"]) > 0) {
    return "Prepare the client discussion pack and record consent after the meeting.";
  }
  if (countByState(items, ["EXECUTION_READY"]) > 0) {
    return "Follow implementation status and confirm execution handoff evidence.";
  }
  if (items.length > 0) {
    return "Submit ready advisor drafts for risk or compliance review.";
  }
  return "Create a proposal from the live portfolio book when an advisory idea is ready.";
}

export function buildAdvisoryOverviewModel({
  portfolioId,
  proposals,
}: {
  portfolioId: string;
  proposals: ProposalSummary[];
}): AdvisoryOverviewModel {
  const reviewBlockers = countByState(proposals, ["RISK_REVIEW", "COMPLIANCE_REVIEW"]);
  const awaitingClient = countByState(proposals, ["AWAITING_CLIENT_CONSENT"]);
  const executionReady = countByState(proposals, ["EXECUTION_READY"]);
  const drafts = countByState(proposals, ["DRAFT"]);

  const proposalRows = [...proposals]
    .sort(
      (left, right) =>
        proposalAttentionPriority(right.current_state) -
        proposalAttentionPriority(left.current_state)
    )
    .slice(0, 8)
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
        label: "Open Proposals",
        value: String(proposals.length),
        detail: "Advisor-use proposals in the selected portfolio scope.",
        tone: proposals.length > 0 ? "default" : "success",
      },
      {
        label: "Review Blockers",
        value: String(reviewBlockers),
        detail: "Risk or compliance review items that need action.",
        tone: reviewBlockers > 0 ? "warn" : "success",
      },
      {
        label: "Client Discussion",
        value: String(awaitingClient),
        detail: "Proposals waiting for client consent or discussion.",
        tone: awaitingClient > 0 ? "warn" : "default",
      },
      {
        label: "Implementation",
        value: String(executionReady),
        detail: "Approved proposals ready for execution follow-up.",
        tone: executionReady > 0 ? "success" : "default",
      },
      {
        label: "Draft Ideas",
        value: String(drafts),
        detail: "Advisor drafts that can be routed for review.",
        tone: drafts > 0 ? "default" : "success",
      },
    ],
    journeyCards: ADVISORY_JOURNEY_DEFINITIONS.filter((definition) => definition.shellVisible).map(
      (definition) => {
        const count = journeyCount(proposals, definition.key);
        return {
          key: definition.key,
          label: definition.label,
          detail: definition.detail,
          decision: definition.primaryDecision,
          nextAction: definition.nextAction,
          href: buildAdvisoryJourneyHref(portfolioId, definition.key),
          countLabel: count === null ? "Open" : String(count),
        };
      }
    ),
    proposalRows,
  };
}
