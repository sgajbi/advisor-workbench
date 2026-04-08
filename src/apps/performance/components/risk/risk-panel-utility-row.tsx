"use client";

import type { ReactNode } from "react";

import type {
  PerformanceRiskConcentrationContextRow,
  PerformanceRiskContextRow,
} from "../../risk-workspace-view-model";
import RiskDrilldownAction from "./risk-drilldown-action";
import RiskMethodologyAccess from "./risk-methodology-access";

type RiskPanelUtilityRowProps = {
  panelTitle: string;
  methodologyRows?: Array<PerformanceRiskContextRow | PerformanceRiskConcentrationContextRow>;
  drilldownAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
};

export default function RiskPanelUtilityRow({
  panelTitle,
  methodologyRows = [],
  drilldownAction,
  children,
}: RiskPanelUtilityRowProps) {
  if (!methodologyRows.length && !drilldownAction && !children) {
    return null;
  }

  return (
    <div
      className="performance-risk-panel-utility-row"
      role="group"
      aria-label={`${panelTitle} panel utilities`}
    >
      {methodologyRows.length ? (
        <RiskMethodologyAccess panelTitle={panelTitle} rows={methodologyRows} />
      ) : null}
      {drilldownAction ? (
        <RiskDrilldownAction
          label={drilldownAction.label}
          onClick={drilldownAction.onClick}
        />
      ) : null}
      {children}
    </div>
  );
}
