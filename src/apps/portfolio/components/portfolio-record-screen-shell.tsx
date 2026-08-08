"use client";

import type { ReactNode } from "react";

import {
  DegradedStatePanel,
  MainWithSideRailLayout,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";

import type { PortfolioRecordScreenData } from "../portfolio-record-screen-data";
import {
  buildPortfolioRecordDisplayName,
  buildPortfolioRecordHeaderKpis,
  buildPortfolioRecordHeaderMeta,
  buildPortfolioRecordScreenSubtitle,
  getPortfolioRecordScreenCopy,
  type PortfolioRecordScreenKind,
} from "../portfolio-record-screen-view-model";
import PortfolioPageLayout from "./portfolio-page-layout";
import PortfolioRecordEvidenceRail from "./portfolio-record-evidence-rail";
import PortfolioScreenRail from "./portfolio-screen-rail";

export default function PortfolioRecordScreenShell({
  screen,
  portfolioId,
  workspace,
  children,
}: PortfolioRecordScreenData & {
  screen: PortfolioRecordScreenKind;
  children?: ReactNode;
}) {
  const copy = getPortfolioRecordScreenCopy(screen);
  const resolvedPortfolioId = portfolioId ?? "No portfolio";
  const bookDisplayName = workspace ? buildPortfolioRecordDisplayName(workspace) : resolvedPortfolioId;
  const headerKpis = workspace ? buildPortfolioRecordHeaderKpis(workspace, "30D", screen) : [];

  return (
    <PortfolioPageLayout>
      <MainWithSideRailLayout
        className="portfolio-layout portfolio-record-screen-layout"
        railClassName="portfolio-screen-rail-shell"
        mainClassName="portfolio-main portfolio-record-screen-main"
        rail={<PortfolioScreenRail portfolioId={resolvedPortfolioId} activeScreen={screen} />}
        side={workspace ? <PortfolioRecordEvidenceRail screen={screen} workspace={workspace} /> : undefined}
        sideClassName="portfolio-record-evidence-shell"
        main={
          <WorkbenchPageFrame
            className="portfolio-page-frame portfolio-record-page-frame"
            bodyClassName="portfolio-page-frame-body"
            title={copy.title}
            subtitle={buildPortfolioRecordScreenSubtitle(screen)}
          >
            <WorkbenchSectionStack className="portfolio-page-sections">
              {!workspace ? (
                <DegradedStatePanel title="Portfolio records unavailable">
                  The selected portfolio records are not available for this review.
                </DegradedStatePanel>
              ) : (
                <>
                  <section className="portfolio-record-standalone-header">
                    <div>
                      <span>{copy.kicker}</span>
                      <h1>{bookDisplayName}</h1>
                      <p>{buildPortfolioRecordHeaderMeta(workspace)}</p>
                    </div>
                    <div className="portfolio-record-standalone-kpis">
                      {headerKpis.map((kpi) => (
                        <div key={kpi.label}>
                          <span>{kpi.label}</span>
                          <strong>{kpi.value}</strong>
                        </div>
                      ))}
                    </div>
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
