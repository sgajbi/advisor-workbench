import {
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";
import ReviewContextRecovery from "@/shell/review-context-recovery";

import { buildUnavailablePortfolioReviewContextStrip } from "../portfolio-review-context-strip-view-model";
import PortfolioPageLayout from "./portfolio-page-layout";

export default function PortfolioReviewRecovery({
  body,
  href,
  actionLabel,
}: {
  body: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <PortfolioPageLayout
      reviewContext={buildUnavailablePortfolioReviewContextStrip()}
    >
      <WorkbenchPageFrame
        className="portfolio-page-frame"
        bodyClassName="portfolio-page-frame-body"
        title="Portfolio Review"
        subtitle="Confirm the review portfolio before using decision evidence."
      >
        <WorkbenchSectionStack className="portfolio-page-sections">
          <ReviewContextRecovery
            body={body}
            href={href}
            actionLabel={actionLabel}
          />
        </WorkbenchSectionStack>
      </WorkbenchPageFrame>
    </PortfolioPageLayout>
  );
}
