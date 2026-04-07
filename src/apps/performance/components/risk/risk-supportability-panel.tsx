import { SectionBlock, SemanticBadge, Text } from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";

const STATE_TONE = {
  ready: "success",
  partial: "warn",
  unavailable: "danger",
  blocked: "danger",
} as const;

export default function RiskSupportabilityPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  return (
    <SectionBlock
      title="Supportability"
      subtitle="Source readiness for the stateful risk contract."
      className="performance-risk-panel performance-risk-supportability-panel"
    >
      <div className="performance-risk-supportability-list">
        {viewModel.supportability.map((item) => (
          <div key={item.key} className="performance-risk-supportability-row">
            <div>
              <Text variant="cardTitle">{item.label}</Text>
              {item.reason ? <Text variant="metadata">{item.reason}</Text> : null}
            </div>
            <SemanticBadge tone={STATE_TONE[item.state]}>{item.state}</SemanticBadge>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}
