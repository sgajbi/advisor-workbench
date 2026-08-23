import { cx } from "../utils/cx";

import ReviewContextStrip, { type ReviewContextStripModel } from "./review-context-strip";
import { WorkstationPage } from "./workspace-layout";

export default function AppPageShell({
  children,
  className,
  pageKey,
  reviewContext,
}: {
  children: React.ReactNode;
  className?: string;
  pageKey?: string;
  reviewContext?: ReviewContextStripModel;
}) {
  return (
    <WorkstationPage
      className={cx(
        "app-page-shell",
        pageKey ? `app-page-shell-${pageKey}` : undefined,
        className
      )}
    >
      {reviewContext ? <ReviewContextStrip context={reviewContext} /> : null}
      {children}
    </WorkstationPage>
  );
}
