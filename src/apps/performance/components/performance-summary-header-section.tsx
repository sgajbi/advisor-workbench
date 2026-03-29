import { Box, Stack } from "@mui/material";

import { AnalyticsSectionHeader, Panel, StatusChip } from "@/design-system";
import { isSupportedCapability } from "@/shell/workspace-capabilities";

import { formatCompactPct, formatCurrency, formatDate, formatLabel, formatPct } from "../formatters";
import type { PerformanceSummaryHeaderSectionProps } from "./performance-workspace-types";

type SummaryMetricCard = {
  label: string;
  value: string | number;
  support?: string;
  emphasize?: boolean;
  unavailable?: boolean;
};

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
  const hasBenchmark = capabilities.benchmarkComparison.state !== "unavailable";
  const hasHistory = isSupportedCapability(capabilities.returnPath);
  const benchmarkValue = hasBenchmark ? selectedBenchmarkLabel ?? "Assigned" : "Unassigned";
  const benchmarkHint =
    capabilities.benchmarkComparison.state === "supported"
      ? "Relative analytics are active for this mandate."
      : capabilities.benchmarkComparison.state === "partial"
        ? capabilities.benchmarkComparison.reason ?? "Benchmark-relative analytics are partially available."
        : "Assign a benchmark to enable relative analytics.";

  const primaryReturnCard = buildMetricCard({
    label: detailBasis === "GROSS" ? "Gross Return" : "Net Return",
    value:
      selectedPerformance?.portfolio_return_pct !== null &&
      selectedPerformance?.portfolio_return_pct !== undefined
        ? formatPct(selectedPerformance.portfolio_return_pct)
        : "Unavailable",
    support:
      capabilities.benchmarkComparison.state === "supported"
        ? `Active ${formatCompactPct(selectedPerformance?.active_return_pct ?? null)} versus benchmark`
        : "Absolute performance for the selected mandate and horizon.",
    emphasize: true,
    unavailable:
      selectedPerformance?.portfolio_return_pct === null ||
      selectedPerformance?.portfolio_return_pct === undefined,
  });

  const benchmarkCard = buildMetricCard({
    label: "Benchmark Return",
    value:
      capabilities.benchmarkComparison.state === "supported" &&
      selectedPerformance?.benchmark_return_pct !== null &&
      selectedPerformance?.benchmark_return_pct !== undefined
        ? formatPct(selectedPerformance.benchmark_return_pct)
        : "Unavailable",
    support:
      capabilities.benchmarkComparison.reason ??
      "Benchmark comparison for the selected period.",
    unavailable:
      capabilities.benchmarkComparison.state !== "supported" ||
      selectedPerformance?.benchmark_return_pct === null ||
      selectedPerformance?.benchmark_return_pct === undefined,
  });

  const activeCard = buildMetricCard({
    label: "Active Return",
    value:
      capabilities.benchmarkComparison.state === "supported" &&
      selectedPerformance?.active_return_pct !== null &&
      selectedPerformance?.active_return_pct !== undefined
        ? formatPct(selectedPerformance.active_return_pct)
        : "Unavailable",
    support:
      capabilities.benchmarkComparison.state === "supported"
        ? "Relative portfolio performance versus the assigned benchmark."
        : capabilities.benchmarkComparison.reason ??
          "Requires an assigned benchmark and published benchmark returns.",
    unavailable:
      capabilities.benchmarkComparison.state !== "supported" ||
      selectedPerformance?.active_return_pct === null ||
      selectedPerformance?.active_return_pct === undefined,
  });

  const moneyWeightedCard = buildMetricCard({
    label: "Money-Weighted",
    value:
      workspace.money_weighted_return?.money_weighted_return_pct !== null &&
      workspace.money_weighted_return?.money_weighted_return_pct !== undefined
        ? formatPct(workspace.money_weighted_return.money_weighted_return_pct)
        : "Unavailable",
    support: hasMoneyWeightedReturn
      ? workspace.money_weighted_return?.annualized_return_pct != null
        ? `Annualized ${formatCompactPct(workspace.money_weighted_return.annualized_return_pct)}${
            suspiciousMoneyWeightedReturn ? " • review cash-flow timing" : ""
          }`
        : workspace.money_weighted_return?.method ?? "Cash-flow aware return"
      : "Requires cash-flow history across the selected period.",
    unavailable:
      workspace.money_weighted_return?.money_weighted_return_pct === null ||
      workspace.money_weighted_return?.money_weighted_return_pct === undefined,
  });

  const contextCards: SummaryMetricCard[] = [
    buildMetricCard({
      label: "Start MV",
      value:
        selectedPerformance?.begin_market_value != null
          ? formatCurrency(selectedPerformance.begin_market_value, workspace.portfolio.base_currency)
          : "Unavailable",
      support: "Opening market value for the selected horizon.",
      unavailable: selectedPerformance?.begin_market_value == null,
    }),
    buildMetricCard({
      label: "End MV",
      value: formatCurrency(
        selectedPerformance?.end_market_value ?? workspace.overview.market_value_base,
        workspace.portfolio.base_currency
      ),
      support: "Latest market value across the mandate.",
      unavailable:
        selectedPerformance?.end_market_value == null && workspace.overview.market_value_base == null,
    }),
    buildMetricCard({
      label: "Net Cash Flow",
      value:
        selectedPerformance?.net_cash_flow != null
          ? formatCurrency(selectedPerformance.net_cash_flow, workspace.portfolio.base_currency)
          : "Unavailable",
      support: "Booked flows inside the selected window.",
      unavailable: selectedPerformance?.net_cash_flow == null,
    }),
    buildMetricCard({
      label: "Cash Weight",
      value: formatPct(workspace.overview.cash_weight_pct),
      support: "Current cash share of the mandate market value.",
      unavailable: workspace.overview.cash_weight_pct == null,
    }),
    buildMetricCard({
      label: "Position Count",
      value: workspace.overview.position_count ?? "Unavailable",
      support: "Currently valued positions in the mandate.",
      unavailable: workspace.overview.position_count == null,
    }),
    buildMetricCard({
      label: "Primary Contributor",
      value: primaryDriver ? formatLabel(primaryDriver.key_label) : "Unavailable",
      support: primaryDriver
        ? `Contribution ${formatCompactPct(primaryDriver.contribution_pct)}`
        : "Requires contribution detail for the selected slice.",
      unavailable: primaryDriver == null,
    }),
  ];

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
              <StatusChip>{hasHistory ? `${workspace.net_chart.length} observations` : "Limited history"}</StatusChip>
              <StatusChip>
                {hasBenchmark
                  ? "Relative measurement"
                  : selectedBenchmarkCode
                    ? "Benchmark unavailable"
                    : "No benchmark assigned"}
              </StatusChip>
            </div>
          </Box>

          <div className="performance-summary-status-card performance-summary-status-card-secondary workbench-summary-metric-card">
            <span className="performance-summary-kpi-label workbench-summary-metric-label">Benchmark</span>
            <strong className="performance-summary-kpi-value workbench-summary-metric-value">{benchmarkValue}</strong>
            <span className="performance-summary-kpi-support workbench-summary-metric-support">{benchmarkHint}</span>
          </div>
        </div>

        <div className="performance-summary-kpi-grid" aria-label="Performance summary metrics">
          {renderMetricCard(primaryReturnCard)}
          {renderMetricCard(benchmarkCard)}
          {renderMetricCard(activeCard)}
          {renderMetricCard(moneyWeightedCard)}
        </div>

        <div className="performance-summary-context-grid">
          {contextCards.map((card) => renderMetricCard(card))}
        </div>
      </Stack>
    </Panel>
  );
}

function buildMetricCard(card: SummaryMetricCard): SummaryMetricCard {
  return card;
}

function renderMetricCard(card: SummaryMetricCard) {
  return (
    <div
      key={card.label}
      className={[
        "performance-summary-kpi-card",
        "workbench-summary-metric-card",
        card.emphasize ? "performance-summary-kpi-card-primary" : "",
        card.unavailable ? "performance-summary-kpi-card-unavailable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="performance-summary-kpi-label workbench-summary-metric-label">{card.label}</span>
      <strong className="performance-summary-kpi-value workbench-summary-metric-value">{card.value}</strong>
      {card.support ? (
        <span className="performance-summary-kpi-support workbench-summary-metric-support">{card.support}</span>
      ) : null}
    </div>
  );
}
