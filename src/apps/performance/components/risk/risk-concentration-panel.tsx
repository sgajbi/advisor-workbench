import { SectionBlock } from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import RiskConcentrationContextPanel from "./risk-concentration-context-panel";
import RiskConcentrationDriverAnalysis from "./risk-concentration-driver-analysis";
import RiskConcentrationExecutiveSummary from "./risk-concentration-executive-summary";
import RiskConcentrationIndicatorStrip from "./risk-concentration-indicator-strip";
import RiskConcentrationScale from "./risk-concentration-scale";

export default function RiskConcentrationPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  return (
    <SectionBlock
      title="Concentration"
      subtitle="Front-office concentration posture, principal drivers, and issuer-reliability context."
      className="performance-risk-panel performance-risk-concentration-panel"
    >
      <div className="performance-risk-concentration-upper">
        <div className="performance-risk-concentration-upper-main">
          {viewModel.concentrationExecutiveSummary ? (
            <RiskConcentrationExecutiveSummary summary={viewModel.concentrationExecutiveSummary} />
          ) : null}
          <RiskConcentrationDriverAnalysis rows={viewModel.concentrationDriverAnalysis} />
        </div>

        <div className="performance-risk-concentration-upper-side">
          <RiskConcentrationIndicatorStrip indicators={viewModel.concentrationIndicators} />
          <RiskConcentrationScale scales={viewModel.concentrationScales} />
          <RiskConcentrationContextPanel rows={viewModel.concentrationContextRows} />
        </div>
      </div>
    </SectionBlock>
  );
}
