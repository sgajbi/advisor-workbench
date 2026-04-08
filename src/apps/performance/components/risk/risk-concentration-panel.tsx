import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskConcentrationDriverAnalysis from "./risk-concentration-driver-analysis";
import RiskConcentrationIndicatorStrip from "./risk-concentration-indicator-strip";
import RiskConcentrationScale from "./risk-concentration-scale";
import RiskDetailSection from "./risk-detail-section";
import RiskExecutiveSummary from "./risk-executive-summary";
import RiskModuleShell from "./risk-module-shell";
import RiskPanelUtilityRow from "./risk-panel-utility-row";

const POSTURE_TONE = {
  acceptable: "success",
  moderate: "default",
  elevated: "warn",
  high: "danger",
  partial: "warn",
} as const;

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
      className="performance-risk-concentration-panel"
      actions={
        <RiskPanelUtilityRow
          panelTitle="Concentration"
          methodologyRows={viewModel.concentrationContextRows}
        />
      }
      businessReading={
        viewModel.concentrationExecutiveSummary ? (
          <RiskExecutiveSummary
            summary={{
              heading: viewModel.concentrationExecutiveSummary.heading,
              headline: viewModel.concentrationExecutiveSummary.businessReadingHeadline,
              detail: viewModel.concentrationExecutiveSummary.businessReadingDetail,
              actionCue: viewModel.concentrationExecutiveSummary.actionCue,
              postureLabel: viewModel.concentrationExecutiveSummary.postureLabel,
            }}
            ariaLabel="Risk concentration executive summary"
            postureTone={POSTURE_TONE[viewModel.concentrationExecutiveSummary.postureState]}
          />
        ) : null
      }
      headlineMetrics={<RiskConcentrationIndicatorStrip indicators={viewModel.concentrationIndicators} />}
      detail={
        <RiskDetailSection title="Driver analysis" ariaLabel="Risk concentration detail">
          <RiskConcentrationDriverAnalysis rows={viewModel.concentrationDriverAnalysis} />
        </RiskDetailSection>
      }
      context={
        <div className="performance-risk-concentration-side-stack">
          <RiskDetailSection title="Concentration scale" ariaLabel="Risk concentration scale detail">
            <RiskConcentrationScale scales={viewModel.concentrationScales} />
          </RiskDetailSection>
        </div>
      }
    />
  );
}
