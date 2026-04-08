import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskConcentrationIndicatorStrip from "./risk-concentration-indicator-strip";
import RiskConcentrationScale from "./risk-concentration-scale";
import RiskDetailSection from "./risk-detail-section";
import RiskModuleShell from "./risk-module-shell";
import RiskPanelUtilityRow from "./risk-panel-utility-row";

export default function RiskConcentrationPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  return (
    <RiskModuleShell
      title="Concentration"
      subtitle="Front-office concentration posture, principal drivers, and issuer-reliability context."
      priority="primary"
      density="compact"
      className="performance-risk-concentration-panel"
      actions={
        <RiskPanelUtilityRow
          panelTitle="Concentration"
          methodologyRows={viewModel.concentrationContextRows}
        />
      }
      headlineMetrics={<RiskConcentrationIndicatorStrip indicators={viewModel.concentrationIndicators} />}
      context={
        <div className="performance-risk-concentration-side-stack">
          <RiskDetailSection
            title="Concentration scale"
            ariaLabel="Risk concentration scale detail"
            density="compact"
          >
            <RiskConcentrationScale scales={viewModel.concentrationScales} />
          </RiskDetailSection>
        </div>
      }
    />
  );
}
