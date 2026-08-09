import { Suspense } from "react";

import {
  AppPageShell,
  ScreenStatePanel,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
} from "@/design-system";

import AdvisorBookWorkspace from "./components/advisor-book-workspace";

export default function AdvisorBookPage() {
  return (
    <AppPageShell pageKey="portfolio" className="portfolio-page">
      <WorkbenchPageContainer className="portfolio-page-container">
        <WorkbenchPageFrame
          title="My book"
          subtitle="Review portfolios assigned to the current relationship-manager coverage."
        >
          <Suspense
            fallback={
              <ScreenStatePanel
                kind="loading"
                title="Preparing your book"
                body="Resolving the requested business scope and filters."
                rows={6}
              />
            }
          >
            <AdvisorBookWorkspace />
          </Suspense>
        </WorkbenchPageFrame>
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
