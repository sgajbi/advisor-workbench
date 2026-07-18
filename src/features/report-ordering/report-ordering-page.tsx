import PortfolioScreenRail from "@/apps/portfolio/components/portfolio-screen-rail";
import { getPortfolioCatalog, getPortfolioWorkspaceShell } from "@/apps/portfolio/api";
import { resolveSelectedPortfolioId } from "@/apps/portfolio/portfolio-selection";
import {
  AppPageShell,
  DegradedStatePanel,
  MainWithSideRailLayout,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
} from "@/design-system";

import { ReportOrderingWorkspace } from "./components/report-ordering-workspace";

export async function ReportOrderingPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolioId?: string }>;
}) {
  const [portfolios, resolvedSearch] = await Promise.all([
    getPortfolioCatalog(),
    searchParams,
  ]);
  const portfolioId = resolveSelectedPortfolioId(portfolios, resolvedSearch.portfolioId);
  const workspace = portfolioId ? await getPortfolioWorkspaceShell(portfolioId) : null;

  if (!portfolioId || !workspace) {
    return <ReportOrderingUnavailable portfolioId={portfolioId} />;
  }

  return (
    <ReportOrderingWorkspace
      portfolio={{
        portfolioId,
        displayName: workspace.portfolio.display_name,
        asOfDate: workspace.as_of_date,
        baseCurrency: workspace.portfolio.base_currency,
      }}
    />
  );
}

function ReportOrderingUnavailable({ portfolioId }: { portfolioId: string | null }) {
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
                  { href: "/portfolio", label: "Return To Portfolio" },
                ]}
              >
                Select an available portfolio before preparing a report request. No report choices
                or submission controls are shown without confirmed portfolio context.
              </DegradedStatePanel>
            </WorkbenchPageFrame>
          }
        />
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
