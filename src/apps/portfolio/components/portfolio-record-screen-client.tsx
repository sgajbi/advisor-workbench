"use client";

import { useMemo, useState } from "react";

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
import PortfolioIncomeActivityWorkspace from "./portfolio-income-activity-workspace";
import PortfolioAllocationPanel from "./portfolio-allocation-panel";
import type { PortfolioAllocationSelection } from "../types";
import type { PortfolioRecordScreenKind } from "../portfolio-record-screen-view-model";
import {
  buildAllocationHoldingsBreakdown,
  type AllocationExposureMode,
} from "../portfolio-allocation-drilldown-view-model";
import {
  buildPortfolioRecordDisplayName,
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
  const bookDisplayName = workspace ? buildPortfolioRecordDisplayName(workspace) : resolvedPortfolioId;
  const headerKpis = workspace ? buildPortfolioRecordHeaderKpis(workspace, "30D", screen) : [];
  const [selectedAllocation, setSelectedAllocation] =
    useState<PortfolioAllocationSelection | null>(null);
  const [allocationExposureMode, setAllocationExposureMode] =
    useState<AllocationExposureMode>("direct");
  const allocationHoldings = useMemo(
    () =>
      buildAllocationHoldingsBreakdown({
        positions: workspace?.positions ?? [],
        selection: selectedAllocation,
        exposureMode: allocationExposureMode,
      }),
    [allocationExposureMode, selectedAllocation, workspace?.positions],
  );

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
                <DegradedStatePanel
                  title="Portfolio records unavailable"
                >
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
                  {screen === "allocation" ? (
                    <>
                      <PortfolioAllocationPanel
                        portfolioId={workspace.portfolio.portfolio_id}
                        allocationViews={workspace.allocation_views ?? []}
                        baseCurrency={workspace.portfolio.base_currency}
                        asOfDate={context.selectedAsOfDate}
                        reportingCurrency={context.selectedReportingCurrency}
                        selectedAllocation={selectedAllocation}
                        onSelectionChange={setSelectedAllocation}
                        onExposureModeChange={setAllocationExposureMode}
                      />
                      <PortfolioHoldingsGrid
                        portfolioId={workspace.portfolio.portfolio_id}
                        positions={allocationHoldings.positions}
                        baseCurrency={workspace.portfolio.base_currency}
                        asOfDate={context.selectedAsOfDate}
                        columnMode="expanded"
                        kicker="Exposure contributors"
                        title={allocationHoldings.title}
                        description={allocationHoldings.description}
                        filterLabel={allocationHoldings.filterLabel}
                        onClearFilter={() => setSelectedAllocation(null)}
                      />
                    </>
                  ) : null}
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
                  {screen === "income" ? (
                    <PortfolioIncomeActivityWorkspace workspace={workspace} />
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
