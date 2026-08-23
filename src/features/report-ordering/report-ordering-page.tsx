import PortfolioScreenRail from "@/apps/portfolio/components/portfolio-screen-rail";
import {
  getPortfolioCatalog,
  getPortfolioWorkspaceShell,
} from "@/apps/portfolio/api";
import {
  isPortfolioWorkspaceIdentityConfirmed,
  resolveSelectedPortfolioId,
} from "@/apps/portfolio/portfolio-selection";
import { buildPortfolioReviewContextStrip } from "@/apps/portfolio/portfolio-review-context-strip-view-model";
import { buildUnavailableReviewContextStrip } from "@/shell/review-context-strip-view-model";
import { resolvePortfolioReviewControls } from "@/apps/portfolio/portfolio-workspace-controls";
import {
  AppPageShell,
  buildWorkbenchUnsupportedReviewContextNotice,
  DegradedStatePanel,
  MainWithSideRailLayout,
  type ReviewContextStripModel,
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
        confirmedPortfolioId={null}
        reason="The report address contains repeated or unsupported review context. No report catalogue was requested."
      />
    );
  }
  if (!reviewContextResult.context.portfolioId) {
    return (
      <ReportOrderingUnavailable
        confirmedPortfolioId={null}
        reason="Select a source-confirmed portfolio from My book before preparing a report. No demo portfolio was substituted."
      />
    );
  }

  const portfolios = await getPortfolioCatalog();
  const portfolioId = resolveSelectedPortfolioId(
    portfolios,
    reviewContextResult.context.portfolioId,
  );
  const workspace = portfolioId
    ? await getPortfolioWorkspaceShell(portfolioId)
    : null;

  if (!portfolioId || !workspace) {
    return <ReportOrderingUnavailable confirmedPortfolioId={null} />;
  }
  if (!isPortfolioWorkspaceIdentityConfirmed(workspace, portfolioId)) {
    return (
      <ReportOrderingUnavailable
        confirmedPortfolioId={null}
        reason="The portfolio source did not confirm the selected portfolio identity. No report catalogue was requested."
      />
    );
  }
  const controlResolution = resolvePortfolioReviewControls(
    workspace,
    reviewContextResult.context,
  );
  if (controlResolution.status === "invalid") {
    return (
      <ReportOrderingUnavailable
        confirmedPortfolioId={workspace.portfolio.portfolio_id}
        reviewContext={buildPortfolioReviewContextStrip(workspace)}
        reason="The selected date, period, or reporting currency is not supported for report ordering. No report catalogue was requested."
      />
    );
  }

  return (
    <ReportOrderingWorkspace
      initialBatchId={reviewContextResult.context.batchId}
      reviewContext={buildPortfolioReviewContextStrip(workspace, {
        acceptedReportingCurrency:
          controlResolution.controls.reportingCurrency !==
          workspace.portfolio.base_currency
            ? controlResolution.controls.reportingCurrency
            : undefined,
        notice: toReviewContextNotice(
          buildWorkbenchUnsupportedReviewContextNotice({
            title: "Report source context",
            subject: "Report preparation",
            destination: "report ordering workflow",
            requestedPeriod: reviewContextResult.context.period,
          }),
        ),
      })}
      portfolio={{
        portfolioId,
        asOfDate: controlResolution.controls.asOfDate,
        sourceBaseCurrency: workspace.portfolio.base_currency,
        reportingCurrency: controlResolution.controls.reportingCurrency,
      }}
    />
  );
}

function ReportOrderingUnavailable({
  confirmedPortfolioId,
  reviewContext = buildUnavailableReviewContextStrip(),
  reason = "Select an available portfolio before preparing a report request. No report choices or submission controls are shown without confirmed portfolio context.",
}: {
  confirmedPortfolioId: string | null;
  reviewContext?: ReviewContextStripModel;
  reason?: string;
}) {
  return (
    <AppPageShell
      pageKey="reports"
      className="portfolio-page"
      reviewContext={reviewContext}
    >
      <WorkbenchPageContainer className="portfolio-page-container">
        <MainWithSideRailLayout
          rail={
            confirmedPortfolioId ? (
              <PortfolioScreenRail
                portfolioId={confirmedPortfolioId}
                activeScreen="reports"
              />
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
                actions={[{ href: "/book", label: "Open My Book" }]}
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

function toReviewContextNotice(notice: { title: string; body: string } | null) {
  return notice
    ? {
        label: notice.title,
        message: notice.body,
        tone: "attention" as const,
      }
    : undefined;
}
