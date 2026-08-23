import {
  buildReviewContextHref,
  parseReviewContext,
} from "@/shell/review-context";
import { getPortfolioCatalog, getPortfolioWorkspaceShell } from "./api";
import PortfolioReviewRecovery from "./components/portfolio-review-recovery";
import PortfolioWorkspaceClient from "./components/portfolio-workspace-client";
import { resolveSelectedPortfolioId } from "./portfolio-selection";
import { resolvePortfolioReviewControls } from "./portfolio-workspace-controls";

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
      <PortfolioReviewRecovery
        body="The portfolio review address contains repeated or unsupported context. No portfolio information was requested."
        href="/portfolio"
        actionLabel="Reset review context"
      />
    );
  }

  if (!reviewContextResult.context.portfolioId) {
    return (
      <PortfolioReviewRecovery
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
      <PortfolioReviewRecovery
        body="The selected portfolio is not available in the source-confirmed portfolio catalogue. No alternative portfolio was substituted."
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
      <PortfolioReviewRecovery
        body="The selected date, period, or reporting currency is not supported by this portfolio's source capabilities. No analytical detail was requested."
        href={buildReviewContextHref("/portfolio", resetContext)}
        actionLabel="Use available portfolio context"
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
