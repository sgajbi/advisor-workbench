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
import { REPORT_CENTRE_TITLE } from "./report-ordering-terminology";

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
  const historicalSnapshots = workspace.control_capabilities?.historical_snapshots;
  const hasGovernedReportDateRange = Boolean(
    historicalSnapshots?.state === "supported" &&
      historicalSnapshots.earliest_available_as_of_date &&
      historicalSnapshots.latest_available_as_of_date,
  );
  const reportingCurrencyCapability =
    workspace.control_capabilities?.reporting_currency_restatement;
  const reportingCurrencies =
    reportingCurrencyCapability?.state === "supported"
      ? [...new Set(reportingCurrencyCapability.supported_currencies.filter(Boolean))]
      : [controlResolution.controls.reportingCurrency];
  if (!reportingCurrencies.includes(controlResolution.controls.reportingCurrency)) {
    return (
      <ReportOrderingUnavailable
        confirmedPortfolioId={workspace.portfolio.portfolio_id}
        reviewContext={buildPortfolioReviewContextStrip(workspace)}
        reason="The selected reporting currency is not available for report preparation. No report catalogue was requested."
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
        earliestReportDate: hasGovernedReportDateRange
          ? historicalSnapshots?.earliest_available_as_of_date ?? controlResolution.controls.asOfDate
          : controlResolution.controls.asOfDate,
        latestReportDate: hasGovernedReportDateRange
          ? historicalSnapshots?.latest_available_as_of_date ?? controlResolution.controls.asOfDate
          : controlResolution.controls.asOfDate,
        reportingCurrencies,
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
                relationshipIdBase="report-ordering-page-rail"
              />
            ) : undefined
          }
          main={
            <WorkbenchPageFrame
              title={REPORT_CENTRE_TITLE}
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
