import { Stack } from "@mui/material";

import { AnalyticsSectionHeader, Panel, WorkbenchStatusRow } from "@/design-system";
import PerformanceCapabilityTrustStrip from "./performance-capability-trust-strip";
import PerformanceExecutiveReturnStrip from "./performance-executive-return-strip";
import type { PerformanceSummaryHeaderSectionProps } from "./performance-workspace-types";
import {
  getPerformanceExecutiveReturnPresentation,
  getPerformanceSummaryHeaderPresentation,
  getPerformanceTrustStripPresentation,
} from "./performance-workspace-view-helpers";

export default function PerformanceSummaryHeaderSection({
  workspace,
  detailBasis,
  capabilities,
  selectedBenchmarkCode,
  selectedBenchmarkLabel,
  selectedPerformance,
  hasMoneyWeightedReturn,
  suspiciousMoneyWeightedReturn,
}: PerformanceSummaryHeaderSectionProps) {
  const presentation = getPerformanceSummaryHeaderPresentation({
    workspace,
    detailBasis,
    capabilities,
    selectedBenchmarkCode,
    selectedBenchmarkLabel,
    selectedPerformance,
    hasMoneyWeightedReturn,
    suspiciousMoneyWeightedReturn,
  });
  const executiveStrip = getPerformanceExecutiveReturnPresentation({
    workspace,
    detailBasis,
    selectedPerformance,
    selectedBenchmarkLabel,
    capabilities,
  });
  const trustStrip = getPerformanceTrustStripPresentation({ capabilities });

  return (
    <Stack spacing={1.5} id="performance-overview" className="performance-summary-stage">
      <Panel className="performance-summary-intro workbench-summary-panel workbench-summary-card workbench-summary-card-compact workbench-summary-module-card">
        <Stack spacing={1.25}>
          <AnalyticsSectionHeader
            title={workspace.portfolio.portfolio_id}
            subtitle="Immediate front-office performance summary for the selected mandate"
          />
          <WorkbenchStatusRow
            label="Performance summary observations"
            className="performance-observation-strip"
            items={presentation.observationItems}
          />
        </Stack>
      </Panel>
      <PerformanceExecutiveReturnStrip presentation={executiveStrip} />
      <PerformanceCapabilityTrustStrip presentation={trustStrip} />
    </Stack>
  );
}
