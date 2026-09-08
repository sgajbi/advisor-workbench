"use client";

import type { PortfolioRecordScreenData } from "../portfolio-record-screen-data";
import PortfolioPositionsRecordWorkspace from "./portfolio-positions-record-workspace";
import PortfolioRecordScreenShell from "./portfolio-record-screen-shell";
import { usePortfolioRecordWorkspaceContext } from "./use-portfolio-record-workspace-context";

export default function PortfolioPositionsRecordScreen(props: PortfolioRecordScreenData) {
  const context = usePortfolioRecordWorkspaceContext(props.workspace);

  return (
    <PortfolioRecordScreenShell {...props} screen="positions">
      {props.workspace && context ? (
        <PortfolioPositionsRecordWorkspace
          key={props.workspace.portfolio.portfolio_id}
          workspace={props.workspace}
          asOfDate={context.selectedAsOfDate}
          timeWindow={props.timeWindow ?? context.timeWindow}
          reportingCurrency={context.selectedReportingCurrency}
        />
      ) : null}
    </PortfolioRecordScreenShell>
  );
}
