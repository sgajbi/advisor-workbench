"use client";

import { useMemo } from "react";

import {
  DegradedStatePanel,
  MainWithSideRailLayout,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";

import type { PortfolioWorkspace } from "../types";
import { buildInitialPortfolioControls, buildPortfolioWorkspaceContext } from "../view-model";
import PortfolioPageLayout from "./portfolio-page-layout";
import PortfolioRecordEvidenceRail from "./portfolio-record-evidence-rail";
import PortfolioScreenRail from "./portfolio-screen-rail";
import PortfolioHoldingsGrid from "./portfolio-holdings-grid";
import PortfolioTransactionsGrid from "./portfolio-transactions-grid";
import PortfolioProjectedCashflowModule from "./portfolio-projected-cashflow-module";
import type { PortfolioRecordScreenKind } from "../portfolio-record-screen-view-model";
import {
  buildPortfolioRecordHeaderKpis,
  buildPortfolioRecordHeaderMeta,
  buildPortfolioRecordScreenSubtitle,
  getPortfolioRecordScreenCopy,
} from "../portfolio-record-screen-view-model";

export default function PortfolioRecordScreenClient({
  screen,
  portfolioId,
  workspace,
  startDate,
  endDate,
}: {
  screen: PortfolioRecordScreenKind;
  portfolioId: string | null;
  workspace: PortfolioWorkspace | null;
  startDate?: string;
  endDate?: string;
}) {
  const context = useMemo(() => {
    const controls = buildInitialPortfolioControls(workspace);
    return buildPortfolioWorkspaceContext(workspace, {
      ...controls,
      viewMode: "detailed",
      columnMode: "expanded",
    });
  }, [workspace]);
  const copy = getPortfolioRecordScreenCopy(screen);
  const resolvedPortfolioId = portfolioId ?? "No portfolio";
  const headerKpis = workspace ? buildPortfolioRecordHeaderKpis(workspace) : [];

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
            subtitle={buildPortfolioRecordScreenSubtitle(screen, workspace)}
          >
            <WorkbenchSectionStack className="portfolio-page-sections">
              {!workspace ? (
                <DegradedStatePanel
                  title="Portfolio records unavailable"
                >
                  The selected portfolio could not be loaded from the gateway-backed portfolio workspace.
                </DegradedStatePanel>
              ) : (
                <>
                  <div className="portfolio-record-context-bar">
                    <span>{workspace.portfolio.portfolio_id}</span>
                    <span>{copy.subtitle}</span>
                  </div>
                  <section className="portfolio-record-standalone-header">
                    <div>
                      <span>{copy.kicker}</span>
                      <h1>{workspace.portfolio.portfolio_id}</h1>
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
                  {screen === "positions" ? (
                    <PortfolioHoldingsGrid
                      portfolioId={workspace.portfolio.portfolio_id}
                      positions={workspace.positions}
                      baseCurrency={workspace.portfolio.base_currency}
                      asOfDate={context.selectedAsOfDate}
                      columnMode="expanded"
                    />
                  ) : null}
                  {screen === "transactions" ? (
                    <PortfolioTransactionsGrid
                      portfolioId={workspace.portfolio.portfolio_id}
                      baseCurrency={workspace.portfolio.base_currency}
                      asOfDate={context.selectedAsOfDate}
                      defaultStartDate={startDate ?? context.effectivePeriodStartDate}
                      defaultEndDate={endDate ?? context.effectivePeriodEndDate}
                      initialTransactions={workspace.recent_transactions}
                    />
                  ) : null}
                  {screen === "cashflow" ? (
                    <PortfolioProjectedCashflowModule
                      portfolioId={workspace.portfolio.portfolio_id}
                      baseCurrency={workspace.portfolio.base_currency}
                      asOfDate={context.selectedAsOfDate}
                      initialCashflowOutlook={workspace.cashflow_outlook}
                      defaultExpanded
                    />
                  ) : null}
                </>
              )}
            </WorkbenchSectionStack>
          </WorkbenchPageFrame>
        }
      />
    </PortfolioPageLayout>
  );
}
