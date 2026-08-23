import {
  buildPortfolioReviewContextSource,
  type PortfolioReviewContextSourceInput,
} from "@/apps/portfolio/portfolio-review-context-strip-view-model";
import type { ReviewContextStripModel } from "@/design-system";
import {
  buildReviewContextStripModel,
  buildUnavailableReviewContextStrip,
} from "@/shell/review-context-strip-view-model";

export function buildProposalReviewContextStrip({
  portfolioId,
  portfolioContext,
  notice,
}: {
  portfolioId: string;
  portfolioContext: PortfolioReviewContextSourceInput | null;
  notice?: ReviewContextStripModel["notice"];
}): ReviewContextStripModel {
  if (portfolioContext?.portfolio.portfolio_id === portfolioId) {
    return buildReviewContextStripModel(
      buildPortfolioReviewContextSource(portfolioContext),
      notice ??
        (!portfolioContext.profile
          ? {
              label: "Mandate context limited",
              message:
                "Portfolio identity, business date, and base currency are confirmed from the portfolio book; mandate classification remains unavailable.",
              tone: "attention",
            }
          : undefined),
    );
  }

  return buildUnavailableReviewContextStrip(notice ?? {
      label: "Supporting context unavailable",
      message:
        "Advisory evidence remains available, but portfolio identity and mandate context could not be confirmed.",
      tone: "attention",
    });
}
