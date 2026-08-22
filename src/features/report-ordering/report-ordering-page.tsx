import PortfolioScreenRail from "@/apps/portfolio/components/portfolio-screen-rail";
import { getPortfolioCatalog, getPortfolioWorkspaceShell } from "@/apps/portfolio/api";
import { resolveSelectedPortfolioId } from "@/apps/portfolio/portfolio-selection";
import { resolvePortfolioReviewControls } from "@/apps/portfolio/portfolio-workspace-controls";
import {
  AppPageShell,
  DegradedStatePanel,
  MainWithSideRailLayout,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
} from "@/design-system";
import {
  parseReviewContext,
  type ReviewContextSearchParams,
} from "@/shell/review-context";

import { ReportOrderingWorkspace } from "./components/report-ordering-workspace";

export async function ReportOrderingPage({
  searchParams,
}: {
  searchParams: Promise<ReviewContextSearchParams>;
}) {
  const resolvedSearch = await searchParams;
  const reviewContextResult = parseReviewContext(resolvedSearch);
  if (reviewContextResult.status === "invalid") {
    return (
      <ReportOrderingUnavailable
        portfolioId={null}
        reason="The report address contains repeated or unsupported review context. No report catalogue was requested."
      />
    );
  }
  if (!reviewContextResult.context.portfolioId) {
    return (
      <ReportOrderingUnavailable
        portfolioId={null}
        reason="Select a source-confirmed portfolio from My book before preparing a report. No demo portfolio was substituted."
      />
    );
  }

  const portfolios = await getPortfolioCatalog();
  const portfolioId = resolveSelectedPortfolioId(
    portfolios,
    reviewContextResult.context.portfolioId,
  );
  const workspace = portfolioId ? await getPortfolioWorkspaceShell(portfolioId) : null;

  if (!portfolioId || !workspace) {
    return <ReportOrderingUnavailable portfolioId={portfolioId} />;
  }
  const controlResolution = resolvePortfolioReviewControls(
    workspace,
    reviewContextResult.context,
  );
  if (controlResolution.status === "invalid") {
    return (
      <ReportOrderingUnavailable
        portfolioId={portfolioId}
        reason="The selected date, period, or reporting currency is not supported for report ordering. No report catalogue was requested."
      />
    );
  }

  return (
    <ReportOrderingWorkspace
      initialBatchId={reviewContextResult.context.batchId}
      portfolio={{
        portfolioId,
        displayName: workspace.portfolio.display_name,
        asOfDate: controlResolution.controls.asOfDate,
        sourceBaseCurrency: workspace.portfolio.base_currency,
        reportingCurrency: controlResolution.controls.reportingCurrency,
      }}
    />
  );
}

function ReportOrderingUnavailable({
  portfolioId,
  reason =
    "Select an available portfolio before preparing a report request. No report choices or submission controls are shown without confirmed portfolio context.",
}: {
  portfolioId: string | null;
  reason?: string;
}) {
  return (
    <AppPageShell pageKey="reports" className="portfolio-page">
      <WorkbenchPageContainer className="portfolio-page-container">
        <MainWithSideRailLayout
          rail={
            portfolioId ? (
              <PortfolioScreenRail portfolioId={portfolioId} activeScreen="reports" />
            ) : undefined
          }
          main={
            <WorkbenchPageFrame
              title="Report Centre"
              subtitle="Approved portfolio report ordering and request monitoring."
            >
              <DegradedStatePanel
                label="Portfolio context"
                title="Portfolio reporting context is unavailable"
                tone="warn"
                status="Unavailable"
                actions={[
                  { href: "/book", label: "Open My Book" },
                ]}
              >
                {reason}
              </DegradedStatePanel>
            </WorkbenchPageFrame>
          }
        />
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
