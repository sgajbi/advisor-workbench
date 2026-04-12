import type { ReactNode } from "react";

import { AppPageShell, WorkbenchPageContainer } from "@/design-system";

export default function PortfolioPageLayout({ children }: { children: ReactNode }) {
  return (
    <AppPageShell pageKey="portfolio" className="portfolio-page">
      <WorkbenchPageContainer className="portfolio-page-container">
        {children}
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
