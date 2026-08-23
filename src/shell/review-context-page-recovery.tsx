import {
  AppPageShell,
  type ReviewContextStripModel,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";

import ReviewContextRecovery from "./review-context-recovery";

const UNAVAILABLE_REVIEW_CONTEXT: ReviewContextStripModel = {
  portfolioName: "Portfolio not confirmed",
  sourceState: "unavailable",
};

export default function ReviewContextPageRecovery({
  pageKey,
  pageTitle,
  pageSubtitle,
  body,
  href,
  actionLabel,
  reviewContext = UNAVAILABLE_REVIEW_CONTEXT,
  className = "portfolio-page",
}: {
  pageKey: string;
  pageTitle: string;
  pageSubtitle: string;
  body: string;
  href: string;
  actionLabel: string;
  reviewContext?: ReviewContextStripModel;
  className?: string;
}) {
  return (
    <AppPageShell
      pageKey={pageKey}
      className={className}
      reviewContext={reviewContext}
    >
      <WorkbenchPageContainer className="portfolio-page-container">
        <WorkbenchPageFrame title={pageTitle} subtitle={pageSubtitle}>
          <WorkbenchSectionStack>
            <ReviewContextRecovery
              body={body}
              href={href}
              actionLabel={actionLabel}
            />
          </WorkbenchSectionStack>
        </WorkbenchPageFrame>
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
