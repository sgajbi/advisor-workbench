import PerformanceCapabilityTrustStrip from "./performance-capability-trust-strip";
import type { PerformanceSummaryHeaderSectionProps } from "./performance-workspace-types";
import {
  getPerformanceSummaryFirstPaintPresentation,
} from "./performance-workspace-view-helpers";

export default function PerformanceSummaryHeaderSection({
  workspace,
  detailBasis,
  capabilities,
  selectedPerformance,
  hasMoneyWeightedReturn,
  suspiciousMoneyWeightedReturn,
}: PerformanceSummaryHeaderSectionProps) {
  const presentation = getPerformanceSummaryFirstPaintPresentation({
    workspace,
    detailBasis,
    capabilities,
    selectedPerformance,
    hasMoneyWeightedReturn,
    suspiciousMoneyWeightedReturn,
  });

  return (
    <section id="performance-overview" className="performance-summary-stage">
      <PerformanceCapabilityTrustStrip presentation={presentation.trust} />
    </section>
  );
}
