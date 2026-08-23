"use client";

import type { ReactNode } from "react";

import {
  DegradedStatePanel,
  MainWithSideRailLayout,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";
import ReviewContextRecovery from "@/shell/review-context-recovery";

import type { PortfolioRecordScreenData } from "../portfolio-record-screen-data";
import type { PortfolioRecordCashflowProjection } from "../portfolio-record-evidence-view-model";
import { buildPortfolioReviewContextStrip } from "../portfolio-review-context-strip-view-model";
import {
  buildPortfolioRecordHeaderKpis,
  buildPortfolioRecordScreenSubtitle,
  getPortfolioRecordScreenCopy,
  type PortfolioRecordScreenKind,
} from "../portfolio-record-screen-view-model";
import PortfolioPageLayout from "./portfolio-page-layout";
import { buildUnavailableReviewContextStrip } from "@/shell/review-context-strip-view-model";
import PortfolioRecordEvidenceRail from "./portfolio-record-evidence-rail";
import PortfolioScreenRail from "./portfolio-screen-rail";

export default function PortfolioRecordScreenShell({
  screen,
  portfolioId,
  portfolioContext,
  workspace,
  timeWindow,
  reviewContextError,
  children,
  cashflowProjection,
}: PortfolioRecordScreenData & {
  screen: PortfolioRecordScreenKind;
  children?: ReactNode;
  cashflowProjection?: PortfolioRecordCashflowProjection;
}) {
  const copy = getPortfolioRecordScreenCopy(screen);
  const confirmedReviewContext = workspace ?? portfolioContext;
  const headerKpis = workspace
    ? buildPortfolioRecordHeaderKpis(workspace, timeWindow ?? "30D", screen)
    : [];

  return (
    <PortfolioPageLayout
      reviewContext={
        confirmedReviewContext
          ? buildPortfolioReviewContextStrip(confirmedReviewContext)
          : buildUnavailableReviewContextStrip()
      }
    >
      <MainWithSideRailLayout
        className="portfolio-layout portfolio-record-screen-layout"
        mainClassName="portfolio-main portfolio-record-screen-main"
        rail={
          portfolioId ? (
            <PortfolioScreenRail
              portfolioId={portfolioId}
              activeScreen={screen}
            />
          ) : undefined
        }
        side={
          workspace ? (
            <PortfolioRecordEvidenceRail
              screen={screen}
              workspace={workspace}
              cashflowProjection={cashflowProjection}
            />
          ) : undefined
        }
        sideClassName="portfolio-record-evidence-shell"
        main={
          <WorkbenchPageFrame
            className="portfolio-page-frame portfolio-record-page-frame"
            bodyClassName="portfolio-page-frame-body"
            title={copy.title}
            subtitle={buildPortfolioRecordScreenSubtitle(screen)}
          >
            <WorkbenchSectionStack className="portfolio-page-sections">
              {reviewContextError ? (
                <ReviewContextRecovery
                  body={reviewContextError}
                  href="/book"
                  actionLabel="Open My book"
                />
              ) : !workspace ? (
                <DegradedStatePanel title="Portfolio records unavailable">
                  The selected portfolio records are not available for this
                  review.
                </DegradedStatePanel>
              ) : (
                <>
                  <section
                    aria-label={`${copy.title} key figures`}
                    className="portfolio-record-key-figures"
                  >
                    <dl>
                      {headerKpis.map((kpi) => (
                        <div key={kpi.label}>
                          <dt>{kpi.label}</dt>
                          <dd>{kpi.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                  {children}
                </>
              )}
            </WorkbenchSectionStack>
          </WorkbenchPageFrame>
        }
      />
    </PortfolioPageLayout>
  );
}
