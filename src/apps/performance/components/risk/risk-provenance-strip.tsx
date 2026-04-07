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
        <span key={item.label} className="performance-risk-provenance-item">
          <Text variant="metadata" as="span">
            {item.label}
          </Text>
          <strong>{item.value}</strong>
        </span>
      ))}
    </section>
  );
}
