import {
  getPortfolioBook,
  getPortfolioWorkspaceShell,
  type PortfolioBookResponse,
} from "@/apps/portfolio/api";
import type { PortfolioReviewContextSourceInput } from "@/apps/portfolio/portfolio-review-context-strip-view-model";
import type { PortfolioWorkspace } from "@/apps/portfolio/types";

import type { AdvisoryJourneyReviewContext } from "./advisory-journey-navigation";

type ProposalPortfolioContextLoaders = {
  loadWorkspace: (portfolioId: string) => Promise<PortfolioWorkspace | null>;
  loadBook: (
    portfolioId: string,
    controls: { asOfDate?: string; reportingCurrency?: string },
  ) => Promise<PortfolioBookResponse | null>;
};

const defaultLoaders: ProposalPortfolioContextLoaders = {
  loadWorkspace: getPortfolioWorkspaceShell,
  loadBook: getPortfolioBook,
};

export async function loadProposalPortfolioContext({
  portfolioId,
  reviewContext,
  loaders = defaultLoaders,
}: {
  portfolioId: string;
  reviewContext: Pick<
    AdvisoryJourneyReviewContext,
    "asOfDate" | "reportingCurrency"
  >;
  loaders?: ProposalPortfolioContextLoaders;
}): Promise<PortfolioReviewContextSourceInput | null> {
  const workspaceContext = resolveProposalPortfolioContext(
    portfolioId,
    await loaders.loadWorkspace(portfolioId),
  );
  if (workspaceContext) {
    return workspaceContext;
  }

  return resolveProposalPortfolioContext(
    portfolioId,
    await loaders.loadBook(portfolioId, {
      ...(reviewContext.asOfDate
        ? { asOfDate: reviewContext.asOfDate }
        : {}),
      ...(reviewContext.reportingCurrency
        ? { reportingCurrency: reviewContext.reportingCurrency }
        : {}),
    }),
  );
}

export function resolveProposalPortfolioContext(
  portfolioId: string,
  portfolioContext: PortfolioReviewContextSourceInput | null,
): PortfolioReviewContextSourceInput | null {
  return portfolioContext?.portfolio.portfolio_id === portfolioId
    ? portfolioContext
    : null;
}

export type { ProposalPortfolioContextLoaders };
