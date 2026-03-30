import { Stack } from "@mui/material";

import { AnalyticsSectionHeader, Panel, StatusChip } from "@/design-system";
import { formatDate } from "../formatters";
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
          <div className="performance-observation-strip">
            <StatusChip>As of {formatDate(workspace.as_of_date)}</StatusChip>
            <StatusChip>{workspace.portfolio.base_currency}</StatusChip>
            <StatusChip>
              {presentation.hasHistory ? `${workspace.net_chart.length} observations` : "Limited history"}
            </StatusChip>
            <StatusChip>
              {presentation.hasBenchmark
                ? "Relative measurement"
                : presentation.selectedBenchmarkCode
                  ? "Benchmark unavailable"
                  : "No benchmark assigned"}
            </StatusChip>
          </div>
        </Stack>
      </Panel>
      <PerformanceExecutiveReturnStrip presentation={executiveStrip} />
      <PerformanceCapabilityTrustStrip presentation={trustStrip} />
    </Stack>
  );
}
