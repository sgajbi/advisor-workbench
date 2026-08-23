import {
  buildReviewContextHref,
  parseReviewContext,
} from "@/shell/review-context";
import { getPortfolioCatalog, getPortfolioWorkspaceShell } from "./api";
import ReviewContextPageRecovery from "@/shell/review-context-page-recovery";
import PortfolioWorkspaceClient from "./components/portfolio-workspace-client";
import {
  isPortfolioWorkspaceIdentityConfirmed,
  resolveSelectedPortfolioId,
} from "./portfolio-selection";
import { resolvePortfolioReviewControls } from "./portfolio-workspace-controls";
import { buildPortfolioReviewContextStrip } from "./portfolio-review-context-strip-view-model";

export default async function PortfolioExperiencePage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | readonly string[] | undefined>
  >;
}) {
  const resolvedSearch = await searchParams;
  const reviewContextResult = parseReviewContext(resolvedSearch);
  if (reviewContextResult.status === "invalid") {
    return (
      <ReviewContextPageRecovery
        pageKey="portfolio"
        pageTitle="Portfolio Review"
        pageSubtitle="Confirm the review portfolio before using decision evidence."
        frameClassName="portfolio-page-frame"
        bodyClassName="portfolio-page-frame-body"
        sectionClassName="portfolio-page-sections"
        body="The portfolio review address contains repeated or unsupported context. No portfolio information was requested."
        href="/portfolio"
        actionLabel="Reset review context"
      />
    );
  }

  if (!reviewContextResult.context.portfolioId) {
    return (
      <ReviewContextPageRecovery
        pageKey="portfolio"
        pageTitle="Portfolio Review"
        pageSubtitle="Confirm the review portfolio before using decision evidence."
        frameClassName="portfolio-page-frame"
        bodyClassName="portfolio-page-frame-body"
        sectionClassName="portfolio-page-sections"
        body="Select a source-confirmed portfolio from My book before opening Portfolio Review. No default portfolio was substituted."
        href="/book"
        actionLabel="Open My book"
      />
    );
  }

  const portfolios = await getPortfolioCatalog();
  const selectedPortfolioId = resolveSelectedPortfolioId(
    portfolios,
    reviewContextResult.context.portfolioId,
  );
  const workspace = selectedPortfolioId
    ? await getPortfolioWorkspaceShell(selectedPortfolioId)
    : null;
  if (!selectedPortfolioId) {
    return (
      <ReviewContextPageRecovery
        pageKey="portfolio"
        pageTitle="Portfolio Review"
        pageSubtitle="Confirm the review portfolio before using decision evidence."
        frameClassName="portfolio-page-frame"
        bodyClassName="portfolio-page-frame-body"
        sectionClassName="portfolio-page-sections"
        body="The selected portfolio is not available in the source-confirmed portfolio catalogue. No alternative portfolio was substituted."
        href="/book"
        actionLabel="Choose another portfolio"
      />
    );
  }
  if (
    workspace &&
    !isPortfolioWorkspaceIdentityConfirmed(workspace, selectedPortfolioId)
  ) {
    return (
      <ReviewContextPageRecovery
        pageKey="portfolio"
        pageTitle="Portfolio Review"
        pageSubtitle="Confirm the review portfolio before using decision evidence."
        frameClassName="portfolio-page-frame"
        bodyClassName="portfolio-page-frame-body"
        sectionClassName="portfolio-page-sections"
        body="The portfolio source did not confirm the selected portfolio identity. No portfolio context or analytical detail was displayed."
        href="/book"
        actionLabel="Choose another portfolio"
      />
    );
  }
  const controlResolution = workspace
    ? resolvePortfolioReviewControls(workspace, reviewContextResult.context)
    : null;

  if (workspace && controlResolution?.status === "invalid") {
    const availableControls = resolvePortfolioReviewControls(workspace, {});
    const resetContext =
      availableControls.status === "valid"
        ? {
            portfolioId: workspace.portfolio.portfolio_id,
            asOfDate: availableControls.controls.asOfDate,
            period: availableControls.controls.timeWindow,
            reportingCurrency: availableControls.controls.reportingCurrency,
          }
        : { portfolioId: workspace.portfolio.portfolio_id };
    return (
      <ReviewContextPageRecovery
        pageKey="portfolio"
        pageTitle="Portfolio Review"
        pageSubtitle="Confirm the review portfolio before using decision evidence."
        frameClassName="portfolio-page-frame"
        bodyClassName="portfolio-page-frame-body"
        sectionClassName="portfolio-page-sections"
        body="The selected date, period, or reporting currency is not supported by this portfolio's source capabilities. No analytical detail was requested."
        href={buildReviewContextHref("/portfolio", resetContext)}
        actionLabel="Use available portfolio context"
        reviewContext={buildPortfolioReviewContextStrip(workspace)}
      />
    );
  }

  return (
    <PortfolioWorkspaceClient
      portfolios={portfolios}
      selectedPortfolioId={selectedPortfolioId}
      initialWorkspace={workspace}
      initialControls={
        controlResolution?.status === "valid"
          ? controlResolution.controls
          : undefined
      }
    />
  );
}
