import PerformanceCapabilityTrustStrip from "./performance-capability-trust-strip";
import type { PerformanceSummaryHeaderSectionProps } from "./performance-workspace-types";
import {
  getPerformanceTrustStripPresentation,
} from "./performance-workspace-view-helpers";

export default function PerformanceSummaryHeaderSection({
  workspace,
  detailBasis,
  capabilities,
  selectedPerformance,
  hasMoneyWeightedReturn,
  suspiciousMoneyWeightedReturn,
}: PerformanceSummaryHeaderSectionProps) {
  void workspace;
  void detailBasis;
  void selectedPerformance;
  void hasMoneyWeightedReturn;
  void suspiciousMoneyWeightedReturn;

  const presentation = getPerformanceTrustStripPresentation({
    capabilities,
  });

  return (
    <section
      id="performance-overview"
      className="performance-summary-stage performance-lotus-stage performance-lotus-stage-summary"
    >
      <PerformanceCapabilityTrustStrip presentation={presentation} />
    </section>
  );
}
