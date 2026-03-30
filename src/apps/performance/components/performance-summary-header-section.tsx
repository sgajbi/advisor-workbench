import { Stack } from "@mui/material";

import PerformanceCapabilityTrustStrip from "./performance-capability-trust-strip";
import PerformanceExecutiveReturnStrip from "./performance-executive-return-strip";
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
    <Stack spacing={1.5} id="performance-overview" className="performance-summary-stage">
      <PerformanceExecutiveReturnStrip presentation={presentation.executive} />
      <PerformanceCapabilityTrustStrip presentation={presentation.trust} />
    </Stack>
  );
}
