import type { PortfolioWorkspace } from "@/apps/portfolio/types";
import { buildPortfolioReviewContextStrip } from "@/apps/portfolio/portfolio-review-context-strip-view-model";
import type { ReviewContextStripModel } from "@/design-system";
import { buildUnavailableReviewContextStrip } from "@/shell/review-context-strip-view-model";

export function buildProposalReviewContextStrip({
  portfolioId,
  portfolioContext,
  notice,
}: {
  portfolioId: string;
  portfolioContext: PortfolioWorkspace | null;
  notice?: ReviewContextStripModel["notice"];
}): ReviewContextStripModel {
  if (portfolioContext?.portfolio.portfolio_id === portfolioId) {
    return buildPortfolioReviewContextStrip(portfolioContext, { notice });
  }

  return buildUnavailableReviewContextStrip(notice ?? {
      label: "Supporting context unavailable",
      message:
        "Advisory evidence remains available, but portfolio identity and mandate context could not be confirmed.",
      tone: "attention",
    });
}
