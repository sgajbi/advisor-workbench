import type { ProposalSummary } from "./types";
import { proposalNextAction } from "./proposal-workflow-copy";

export type AdvisoryOpportunityRow = {
  proposalId: string;
  title: string;
  portfolio: string;
  advisor: string;
  createdAt: string;
  nextAction: string;
  href: string;
};

export type AdvisoryOpportunitiesModel = {
  portfolioId: string;
  draftCount: number;
  primaryDecision: string;
  recommendedAction: string;
  rows: AdvisoryOpportunityRow[];
};

function dateLabel(value: string | undefined): string {
  if (!value) {
    return "Date pending";
  }
  return value;
}

export function buildAdvisoryOpportunitiesModel({
  portfolioId,
  proposals,
}: {
  portfolioId: string;
  proposals: ProposalSummary[];
}): AdvisoryOpportunitiesModel {
  const draftProposals = proposals.filter((proposal) => proposal.current_state === "DRAFT");

  return {
    portfolioId,
    draftCount: draftProposals.length,
    primaryDecision: "Which advisor idea should be turned into a proposal review package?",
    recommendedAction:
      draftProposals.length > 0
        ? "Open a draft idea, confirm position-level intent, then route it for review."
        : "Start with the live portfolio book and create a draft when the client objective is clear.",
    rows: draftProposals.slice(0, 12).map((proposal) => ({
      proposalId: proposal.proposal_id,
      title: proposal.title || proposal.proposal_id,
      portfolio: proposal.portfolio_id ?? portfolioId,
      advisor: proposal.created_by ?? "Advisor pending",
      createdAt: dateLabel(proposal.created_at),
      nextAction: proposalNextAction(proposal.current_state),
      href: `/proposals/${proposal.proposal_id}`,
    })),
  };
}
