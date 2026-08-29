import {
  buildAdvisoryJourneyHref,
  getAdvisoryJourneyDefinition,
} from "./advisory-journey-navigation";
import {
  buildProposalLifecycleHref,
  getProposalLifecycleModeDefinition,
  type ProposalLifecycleMode,
} from "./proposal-lifecycle-workspace-view-model";
import type { WorkspaceReviewContext } from "@/shell/review-context";

export type ProposalDetailOrigin = ProposalLifecycleMode | "overview";

export function buildProposalDetailReturnHref({
  portfolioId,
  reviewContext,
  origin,
}: {
  portfolioId: string;
  reviewContext?: WorkspaceReviewContext;
  origin: ProposalDetailOrigin;
}): string {
  return origin === "overview"
    ? buildAdvisoryJourneyHref({ ...reviewContext, portfolioId }, "overview")
    : buildProposalLifecycleHref({ portfolioId, reviewContext, mode: origin });
}

export function getProposalDetailReturnTitle(
  origin: ProposalDetailOrigin,
): string {
  return origin === "overview"
    ? getAdvisoryJourneyDefinition(origin).title
    : getProposalLifecycleModeDefinition(origin).title;
}
