"use client";

import {
  selectCashflowPartialFailures,
  selectCashflowWarnings,
} from "../portfolio-projected-cashflow-view-model";
import type { PortfolioRecordCashflowProjection } from "../portfolio-record-evidence-view-model";
import type { PortfolioRecordScreenData } from "../portfolio-record-screen-data";
import { PortfolioProjectedCashflowModuleView } from "./portfolio-projected-cashflow-module";
import PortfolioRecordScreenShell from "./portfolio-record-screen-shell";
import {
  usePortfolioProjectedCashflow,
  type PortfolioProjectedCashflowController,
} from "./use-portfolio-projected-cashflow";
import { usePortfolioRecordWorkspaceContext } from "./use-portfolio-record-workspace-context";

export default function PortfolioCashflowRecordScreen(
  props: PortfolioRecordScreenData,
) {
  const context = usePortfolioRecordWorkspaceContext(props.workspace);

  if (!props.workspace || !context) {
    return <PortfolioRecordScreenShell {...props} screen="cashflow" />;
  }

  return (
    <LoadedPortfolioCashflowRecordScreen
      key={`${props.workspace.portfolio.portfolio_id}-${context.selectedAsOfDate}`}
      {...props}
      workspace={props.workspace}
      selectedAsOfDate={context.selectedAsOfDate}
    />
  );
}

function LoadedPortfolioCashflowRecordScreen({
  selectedAsOfDate,
  ...props
}: PortfolioRecordScreenData & {
  workspace: NonNullable<PortfolioRecordScreenData["workspace"]>;
  selectedAsOfDate: string;
}) {
  const cashflow = usePortfolioProjectedCashflow({
    portfolioId: props.workspace.portfolio.portfolio_id,
    asOfDate: selectedAsOfDate,
    initialCashflowOutlook: props.workspace.cashflow_outlook,
    initialWarnings: selectCashflowWarnings(props.workspace.warnings),
    initialPartialFailures: selectCashflowPartialFailures(
      props.workspace.partial_failures,
    ),
  });

  return (
    <PortfolioRecordScreenShell
      {...props}
      screen="cashflow"
      cashflowProjection={buildCashflowProjectionEvidence(cashflow)}
    >
      <PortfolioProjectedCashflowModuleView
        key={`${props.workspace.portfolio.portfolio_id}-${selectedAsOfDate}`}
        portfolioId={props.workspace.portfolio.portfolio_id}
        baseCurrency={props.workspace.portfolio.base_currency}
        cashflow={cashflow}
        defaultExpanded
      />
    </PortfolioRecordScreenShell>
  );
}

function buildCashflowProjectionEvidence(
  cashflow: PortfolioProjectedCashflowController,
): PortfolioRecordCashflowProjection {
  const state = cashflow.loading
    ? "loading"
    : cashflow.failure
      ? cashflow.selectedSnapshot
        ? "unconfirmed"
        : "unavailable"
      : cashflow.refreshingEvidence
        ? "refreshing"
        : "ready";

  return {
    selectedHorizonDays: cashflow.selectedHorizonDays,
    snapshot: cashflow.selectedSnapshot,
    state,
  };
}
