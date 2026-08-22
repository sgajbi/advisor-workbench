"use client";

import { useMemo, useState } from "react";

import {
  buildAllocationHoldingsBreakdown,
  type AllocationExposureMode,
} from "../portfolio-allocation-drilldown-view-model";
import type { PortfolioRecordScreenData } from "../portfolio-record-screen-data";
import type { PortfolioAllocationSelection, PortfolioWorkspace } from "../types";
import type { PortfolioTimeWindow } from "../view-model";
import PortfolioAllocationPanel from "./portfolio-allocation-panel";
import PortfolioHoldingsGrid from "./portfolio-holdings-grid";
import PortfolioRecordScreenShell from "./portfolio-record-screen-shell";
import { usePortfolioRecordWorkspaceContext } from "./use-portfolio-record-workspace-context";

export default function PortfolioAllocationRecordScreen(props: PortfolioRecordScreenData) {
  const context = usePortfolioRecordWorkspaceContext(props.workspace);

  return (
    <PortfolioRecordScreenShell {...props} screen="allocation">
      {props.workspace && context ? (
        <PortfolioAllocationRecordWorkspace
          key={props.workspace.portfolio.portfolio_id}
          workspace={props.workspace}
          asOfDate={context.selectedAsOfDate}
          reportingCurrency={context.selectedReportingCurrency}
          timeWindow={props.timeWindow ?? context.timeWindow}
        />
      ) : null}
    </PortfolioRecordScreenShell>
  );
}

function PortfolioAllocationRecordWorkspace({
  workspace,
  asOfDate,
  reportingCurrency,
  timeWindow,
}: {
  workspace: PortfolioWorkspace;
  asOfDate: string;
  reportingCurrency: string;
  timeWindow: PortfolioTimeWindow;
}) {
  const [selectedAllocation, setSelectedAllocation] =
    useState<PortfolioAllocationSelection | null>(null);
  const [allocationExposureMode, setAllocationExposureMode] =
    useState<AllocationExposureMode>("direct");
  const allocationHoldings = useMemo(
    () =>
      buildAllocationHoldingsBreakdown({
        positions: workspace.positions,
        cashBalances: workspace.cash_balances ?? [],
        selection: selectedAllocation,
        exposureMode: allocationExposureMode,
      }),
    [allocationExposureMode, selectedAllocation, workspace.cash_balances, workspace.positions],
  );

  return (
    <>
      <PortfolioAllocationPanel
        portfolioId={workspace.portfolio.portfolio_id}
        allocationViews={workspace.allocation_views ?? []}
        baseCurrency={workspace.portfolio.base_currency}
        asOfDate={asOfDate}
        reportingCurrency={reportingCurrency}
        selectedAllocation={selectedAllocation}
        onSelectionChange={setSelectedAllocation}
        onExposureModeChange={setAllocationExposureMode}
      />
      <PortfolioHoldingsGrid
        reviewContext={{
          portfolioId: workspace.portfolio.portfolio_id,
          asOfDate,
          period: timeWindow,
          reportingCurrency,
        }}
        positions={allocationHoldings.positions}
        baseCurrency={workspace.portfolio.base_currency}
        columnMode="expanded"
        kicker="Exposure contributors"
        title={allocationHoldings.title}
        description={allocationHoldings.description}
        filterLabel={allocationHoldings.filterLabel}
        onClearFilter={() => setSelectedAllocation(null)}
      />
    </>
  );
}
