"use client";

import type {
  PerformanceRiskConcentrationContextRow,
  PerformanceRiskContextRow,
} from "../../risk-workspace-view-model";
import RiskPanelInfoDrawer from "./risk-panel-info-drawer";

export default function RiskMethodologyAccess({
  panelTitle,
  rows,
}: {
  panelTitle: string;
  rows: Array<PerformanceRiskContextRow | PerformanceRiskConcentrationContextRow>;
}) {
  return <RiskPanelInfoDrawer panelTitle={panelTitle} rows={rows} />;
}
