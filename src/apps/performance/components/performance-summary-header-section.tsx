import { Box, Divider, Stack, Typography } from "@mui/material";

import { AnalyticsSectionHeader, AnalyticsStat, Panel, StatusChip } from "@/design-system";

import { formatCompactPct, formatCurrency, formatDate, formatLabel, formatPct } from "../formatters";
import type { PerformanceSummaryHeaderSectionProps } from "./performance-workspace-types";
import { summaryLabelSx } from "./performance-workspace-view-helpers";

export default function PerformanceSummaryHeaderSection({
  workspace,
  detailBasis,
  hasBenchmark,
  hasHistory,
  selectedBenchmarkCode,
  selectedBenchmarkLabel,
  selectedPerformance,
  primaryDriver,
  hasMoneyWeightedReturn,
  suspiciousMoneyWeightedReturn,
}: PerformanceSummaryHeaderSectionProps) {
  return (
    <Panel id="performance-overview" className="performance-summary-stage">
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", xl: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", xl: "flex-start" }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AnalyticsSectionHeader
              title={workspace.portfolio.portfolio_id}
              subtitle="Benchmark-aware performance summary for first paint and mandate context"
            />
            <Box className="performance-observation-strip" sx={{ mt: 1 }}>
              <StatusChip>As of {formatDate(workspace.as_of_date)}</StatusChip>
              <StatusChip>{workspace.portfolio.base_currency}</StatusChip>
              {hasHistory ? (
                <StatusChip>{workspace.net_chart.length} observations</StatusChip>
              ) : (
                <StatusChip>Limited history</StatusChip>
              )}
              {hasBenchmark ? (
                <StatusChip>Relative measurement</StatusChip>
              ) : (
                <StatusChip>
                  {selectedBenchmarkCode ? "Benchmark unavailable" : "No benchmark assigned"}
                </StatusChip>
              )}
            </Box>
          </Box>
          <Box
            sx={{
              minWidth: { xl: 320 },
              width: { xs: "100%", xl: "auto" },
              p: 2,
              borderRadius: 3,
              border: "1px solid rgba(31, 39, 51, 0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,248,250,0.92) 100%)",
            }}
          >
            <Stack spacing={1.5}>
              <AnalyticsStat label="Benchmark" value={selectedBenchmarkLabel ?? "Unassigned"} />
              <Divider flexItem />
              <AnalyticsStat
                label="Primary Contributor"
                value={primaryDriver ? formatLabel(primaryDriver.key_label) : "N/A"}
              />
            </Stack>
          </Box>
        </Stack>

        <Box
          className="performance-summary-grid"
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(240px, 1.15fr) repeat(3, minmax(0, 1fr))",
            },
            gap: 1.25,
          }}
        >
          <AnalyticsStat
            label={detailBasis === "GROSS" ? "Gross Return" : "Net Return"}
            value={formatPct(selectedPerformance?.portfolio_return_pct ?? null)}
            support={
              hasBenchmark
                ? `Active ${formatCompactPct(selectedPerformance?.active_return_pct ?? null)} versus benchmark`
                : "Absolute performance for the selected mandate and horizon"
            }
            emphasize
          />

          <Box className="performance-summary-card">
            <Typography component="span" sx={summaryLabelSx}>
              Benchmark Comparison
            </Typography>
            <Box className="performance-summary-metrics">
              <AnalyticsStat
                label="Portfolio"
                value={formatPct(selectedPerformance?.portfolio_return_pct ?? null)}
              />
              <AnalyticsStat
                label="Benchmark"
                value={formatPct(selectedPerformance?.benchmark_return_pct ?? null)}
              />
              <AnalyticsStat
                label="Active"
                value={formatPct(selectedPerformance?.active_return_pct ?? null)}
              />
              <AnalyticsStat
                label="Annualized"
                value={formatPct(selectedPerformance?.annualized_return_pct ?? null)}
              />
            </Box>
          </Box>

          <Box className="performance-summary-card">
            <Typography component="span" sx={summaryLabelSx}>
              Economic Context
            </Typography>
            <Box className="performance-summary-metrics">
              <AnalyticsStat
                label="Start MV"
                value={formatCurrency(
                  selectedPerformance?.begin_market_value ?? null,
                  workspace.portfolio.base_currency
                )}
              />
              <AnalyticsStat
                label="End MV"
                value={formatCurrency(
                  selectedPerformance?.end_market_value ?? workspace.overview.market_value_base,
                  workspace.portfolio.base_currency
                )}
              />
              <AnalyticsStat
                label="Net Cash Flow"
                value={formatCurrency(
                  selectedPerformance?.net_cash_flow ?? null,
                  workspace.portfolio.base_currency
                )}
              />
              <AnalyticsStat
                label="Cash Weight"
                value={formatPct(workspace.overview.cash_weight_pct)}
              />
            </Box>
          </Box>

          <Box className="performance-summary-card">
            <Typography component="span" sx={summaryLabelSx}>
              Mandate Context
            </Typography>
            <Box className="performance-summary-metrics">
              <AnalyticsStat
                label="Money-Weighted"
                value={
                  workspace.money_weighted_return
                    ? formatPct(workspace.money_weighted_return.money_weighted_return_pct)
                    : "N/A"
                }
              />
              <AnalyticsStat label="Position Count" value={workspace.overview.position_count} />
              <AnalyticsStat
                label="Market Value"
                value={formatCurrency(
                  workspace.overview.market_value_base,
                  workspace.portfolio.base_currency
                )}
              />
              <AnalyticsStat label="Basis" value={detailBasis} />
            </Box>
            {hasMoneyWeightedReturn ? (
              <Typography className="performance-summary-footnote">
                {workspace.money_weighted_return?.annualized_return_pct != null
                  ? `MWR annualized ${formatCompactPct(
                      workspace.money_weighted_return.annualized_return_pct
                    )}`
                  : workspace.money_weighted_return?.method ?? "MWR"}
                {suspiciousMoneyWeightedReturn ? " • review cash-flow timing" : ""}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Stack>
    </Panel>
  );
}
