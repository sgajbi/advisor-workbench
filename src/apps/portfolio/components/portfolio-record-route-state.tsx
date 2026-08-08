"use client";

import {
  ActionButton,
  MainWithSideRailLayout,
  ModuleSkeleton,
  ScreenStatePanel,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";

import {
  buildPortfolioRecordScreenSubtitle,
  getPortfolioRecordScreenCopy,
  type PortfolioRecordScreenKind,
} from "../portfolio-record-screen-view-model";
import PortfolioPageLayout from "./portfolio-page-layout";

export function PortfolioRecordRouteLoading({
  screen,
}: {
  screen: PortfolioRecordScreenKind;
}) {
  const copy = getPortfolioRecordScreenCopy(screen);

  return (
    <PortfolioRecordRouteStateFrame screen={screen}>
      <ScreenStatePanel
        kind="loading"
        surface="portfolio"
        title={`Preparing ${copy.title}`}
        body="Loading the selected portfolio and its latest source-backed records."
        rows={6}
        chart={screen === "cashflow" || screen === "allocation"}
      />
    </PortfolioRecordRouteStateFrame>
  );
}

export function PortfolioRecordRouteError({
  screen,
  reset,
}: {
  screen: PortfolioRecordScreenKind;
  reset: () => void;
}) {
  const copy = getPortfolioRecordScreenCopy(screen);

  return (
    <PortfolioRecordRouteStateFrame screen={screen}>
      <ScreenStatePanel
        kind="error"
        surface="portfolio"
        title={`We could not open ${copy.title}`}
        body="The latest portfolio records could not be prepared. Retry before using this view for a client or investment review."
        hint="If the issue persists, confirm source-service availability with the support team."
        action={
          <ActionButton priority="primary" onClick={reset}>
            Retry portfolio records
          </ActionButton>
        }
      />
    </PortfolioRecordRouteStateFrame>
  );
}

function PortfolioRecordRouteStateFrame({
  screen,
  children,
}: {
  screen: PortfolioRecordScreenKind;
  children: React.ReactNode;
}) {
  const copy = getPortfolioRecordScreenCopy(screen);

  return (
    <PortfolioPageLayout>
      <MainWithSideRailLayout
        className="portfolio-layout portfolio-record-screen-layout"
        railClassName="portfolio-screen-rail-shell"
        mainClassName="portfolio-main portfolio-record-screen-main"
        rail={
          <div aria-hidden="true">
            <ModuleSkeleton rows={5} />
          </div>
        }
        main={
          <WorkbenchPageFrame
            className="portfolio-page-frame portfolio-record-page-frame"
            bodyClassName="portfolio-page-frame-body"
            title={copy.title}
            subtitle={buildPortfolioRecordScreenSubtitle(screen)}
          >
            <WorkbenchSectionStack className="portfolio-page-sections">
              {children}
            </WorkbenchSectionStack>
          </WorkbenchPageFrame>
        }
      />
    </PortfolioPageLayout>
  );
}
