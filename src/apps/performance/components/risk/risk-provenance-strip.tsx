import { Text } from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";

export default function RiskProvenanceStrip({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  return (
    <section className="performance-risk-provenance-strip" aria-label="Risk provenance">
      {viewModel.provenance.map((item) => (
        <div key={item.label} className="performance-risk-provenance-item">
          <Text variant="metadata" as="span" className="performance-risk-provenance-label">
            {item.label}
          </Text>
          <Text variant="body" as="span" className="performance-risk-provenance-value">
            {item.value}
          </Text>
        </div>
      ))}
    </section>
  );
}
