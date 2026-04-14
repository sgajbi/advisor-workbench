import type {
  PerformanceRiskConcentrationContextRow,
  PerformanceRiskContextRow,
} from "../../risk-workspace-view-model";
import PerformancePanelInfoDrawer from "../performance-panel-info-drawer";

export default function RiskPanelInfoDrawer({
  panelTitle,
  rows,
  title = "Methodology & coverage",
}: {
  panelTitle: string;
  rows: Array<PerformanceRiskContextRow | PerformanceRiskConcentrationContextRow>;
  title?: string;
}) {
  if (!rows.length) {
    return null;
  }

  return (
    <PerformancePanelInfoDrawer
      panelTitle={panelTitle}
      title={title}
      rows={rows.map((row) => ({
        key: row.key,
        label: row.label,
        value: row.value,
        support: row.support,
      }))}
    />
  );
}
