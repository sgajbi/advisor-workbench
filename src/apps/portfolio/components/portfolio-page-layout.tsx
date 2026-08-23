import type { ReactNode } from "react";

import {
  AppPageShell,
  type ReviewContextStripModel,
  WorkbenchPageContainer,
} from "@/design-system";

export default function PortfolioPageLayout({
  children,
  reviewContext,
}: {
  children: ReactNode;
  reviewContext?: ReviewContextStripModel;
}) {
  return (
    <AppPageShell
      pageKey="portfolio"
      className="portfolio-page"
      reviewContext={reviewContext}
    >
      <WorkbenchPageContainer className="portfolio-page-container">
        {children}
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
