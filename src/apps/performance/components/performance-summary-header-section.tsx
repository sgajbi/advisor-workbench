import { Box, Stack } from "@mui/material";

import { AnalyticsSectionHeader, Panel, StatusChip } from "@/design-system";
import { formatDate } from "../formatters";
import PerformanceSummaryMetricCard from "./performance-summary-metric-card";
import type { PerformanceSummaryHeaderSectionProps } from "./performance-workspace-types";
import { getPerformanceSummaryHeaderPresentation } from "./performance-workspace-view-helpers";

export default function PerformanceSummaryHeaderSection({
  workspace,
  detailBasis,
  capabilities,
  selectedBenchmarkCode,
  selectedBenchmarkLabel,
  selectedPerformance,
  primaryDriver,
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
    primaryDriver,
    hasMoneyWeightedReturn,
    suspiciousMoneyWeightedReturn,
  });

  return (
    <Panel
      id="performance-overview"
      className="performance-summary-stage workbench-summary-panel workbench-summary-card workbench-summary-card-compact workbench-summary-module-card"
    >
      <Stack spacing={1.5}>
        <div className="performance-summary-topline">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AnalyticsSectionHeader
              title={workspace.portfolio.portfolio_id}
              subtitle="First-paint portfolio performance and mandate context"
            />
            <div className="performance-observation-strip">
              <StatusChip>As of {formatDate(workspace.as_of_date)}</StatusChip>
              <StatusChip>{workspace.portfolio.base_currency}</StatusChip>
              <StatusChip>{presentation.hasHistory ? `${workspace.net_chart.length} observations` : "Limited history"}</StatusChip>
              <StatusChip>
                {presentation.hasBenchmark
                  ? "Relative measurement"
                  : presentation.selectedBenchmarkCode
                    ? "Benchmark unavailable"
                    : "No benchmark assigned"}
              </StatusChip>
            </div>
          </Box>

          <PerformanceSummaryMetricCard
            label="Benchmark"
            value={presentation.benchmarkValue}
            support={presentation.benchmarkHint}
            unavailable={!presentation.hasBenchmark}
            className="performance-summary-status-card performance-summary-status-card-secondary"
          />
        </div>

        <div className="performance-summary-kpi-grid" aria-label="Performance summary metrics">
          <PerformanceSummaryMetricCard {...presentation.primaryReturnCard} />
          <PerformanceSummaryMetricCard {...presentation.benchmarkCard} />
          <PerformanceSummaryMetricCard {...presentation.activeCard} />
          <PerformanceSummaryMetricCard {...presentation.moneyWeightedCard} />
        </div>

        <div className="performance-summary-context-grid">
          {presentation.contextCards.map((card) => (
            <PerformanceSummaryMetricCard key={card.label} {...card} />
          ))}
        </div>
      </Stack>
    </Panel>
  );
}
