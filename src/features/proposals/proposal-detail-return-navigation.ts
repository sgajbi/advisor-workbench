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
import type { ProposalSourceWindowContext } from "./proposal-source-window-navigation";

export type ProposalDetailOrigin = ProposalLifecycleMode | "overview";

export function buildProposalDetailReturnHref({
  portfolioId,
  reviewContext,
  origin,
  sourceWindow,
}: {
  portfolioId: string;
  reviewContext?: WorkspaceReviewContext;
  origin: ProposalDetailOrigin;
  sourceWindow?: ProposalSourceWindowContext;
}): string {
  return origin === "overview"
    ? buildAdvisoryJourneyHref({ ...reviewContext, portfolioId }, "overview")
    : buildProposalLifecycleHref({
        portfolioId,
        reviewContext,
        mode: origin,
        sourceWindow,
      });
}

export function getProposalDetailReturnTitle(
  origin: ProposalDetailOrigin,
): string {
  return origin === "overview"
    ? getAdvisoryJourneyDefinition(origin).title
    : getProposalLifecycleModeDefinition(origin).title;
}
