import { AppPageShell, WorkbenchPageContainer } from "@/design-system";

export default function PortfolioPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppPageShell pageKey="portfolio" className="portfolio-page">
      <WorkbenchPageContainer className="portfolio-page-container">
        {children}
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
