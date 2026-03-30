"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Typography } from "@mui/material";

import {
  AnalyticsTable,
  WorkbenchChartContextRow,
  WorkbenchSegmentedControl,
  WorkbenchSummaryToolbar,
  WorkbenchSummaryVisualCard,
  WorkbenchSummaryVisualMeta,
  WorkbenchSummaryVisualValue,
} from "@/design-system";
import { getWorkbenchPerformanceHorizonComparisonClient } from "@/features/workbench/api";
import type {
  PerformanceBenchmarkOptionView,
  WorkbenchPerformanceHorizonComparison,
} from "@/features/workbench/types";

import { formatCurrency, formatDate, formatPct } from "../formatters";
import PerformanceSummaryDriverModule from "./performance-summary-driver-module";
import { getPerformanceHorizonPresentation } from "./performance-summary-driver-helpers";

type HorizonTableView = "combined" | "returns" | "economics";

export default function PerformanceMultiHorizonPanel({
  portfolioId,
  period,
  detailBasis,
  benchmark,
  chartFrequency,
  benchmarkOptions = [],
}: {
  portfolioId: string;
  period: string;
  detailBasis: string;
  benchmark?: string;
  chartFrequency: string;
  benchmarkOptions?: PerformanceBenchmarkOptionView[];
}) {
  const [comparison, setComparison] = useState<WorkbenchPerformanceHorizonComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tableView, setTableView] = useState<HorizonTableView>("combined");
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, WorkbenchPerformanceHorizonComparison>>(new Map());

  useEffect(() => {
    const cacheKey = JSON.stringify({
      portfolioId,
      detailBasis,
      benchmark: benchmark ?? null,
      chartFrequency,
    });
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setComparison(cached);
      setIsLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    void getWorkbenchPerformanceHorizonComparisonClient(portfolioId, {
      detailBasis,
      benchmark,
      chartFrequency,
    })
      .then((result) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        cacheRef.current.set(cacheKey, result);
        setComparison(result);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setComparison({
          correlation_id: "",
          contract_version: "v1",
          portfolio_id: portfolioId,
          as_of_date: "",
          reporting_currency: null,
          detail_basis: detailBasis,
          benchmark_code: benchmark ?? null,
          benchmark_options: benchmarkOptions,
          rows: [],
          warnings: [],
          partial_failures: [],
        });
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      });
  }, [
    benchmark,
    benchmarkOptions,
    chartFrequency,
    detailBasis,
    portfolioId,
  ]);
  const rows = comparison?.rows ?? null;
  const reportingCurrency = comparison?.reporting_currency ?? "USD";
  const resolvedBenchmarkOptions = comparison?.benchmark_options?.length
    ? comparison.benchmark_options
    : benchmarkOptions;

  const scale = Math.max(
    1,
    ...(rows ?? []).flatMap((row) => [
      Math.abs(row.portfolio_return_pct ?? 0),
      Math.abs(row.benchmark_return_pct ?? 0),
    ])
  );
  const selectedPeriodRow =
    rows?.find((row) => row.period === period) ?? rows?.find((row) => row.period === "YTD") ?? rows?.[0];
  const presentation = getPerformanceHorizonPresentation({
    benchmark,
    benchmarkOptions: resolvedBenchmarkOptions,
    detailBasis,
    period,
    selectedPeriodRow,
  });
  const tableModel = useMemo(() => {
    const leadingColumns = [
      { key: "period", label: "Period" },
      { key: "window", label: "Window" },
    ];
    const returnColumns = [
      { key: "netReturn", label: "Net", align: "right" as const },
      { key: "grossReturn", label: "Gross", align: "right" as const },
      { key: "benchmarkReturn", label: "Benchmark", align: "right" as const },
      { key: "activeReturn", label: "Active", align: "right" as const },
      { key: "cumulativeActive", label: "Cum Active", align: "right" as const },
      { key: "annualizedNet", label: "Ann. Net", align: "right" as const },
    ];
    const economicsColumns = [
      { key: "beginMv", label: "Begin MV", align: "right" as const },
      { key: "endMv", label: "End MV", align: "right" as const },
      { key: "netCashFlow", label: "Net Flow", align: "right" as const },
      { key: "fees", label: "Fees", align: "right" as const },
    ];
    const columns =
      tableView === "returns"
        ? [...leadingColumns, ...returnColumns]
        : tableView === "economics"
          ? [...leadingColumns, ...economicsColumns]
          : [...leadingColumns, ...economicsColumns, ...returnColumns];

    return {
      columns,
      rows: (rows ?? []).map((row) => {
        const cellMap: Record<string, string> = {
          period: row.period,
          window:
            row.period_start && row.period_end
              ? `${formatDate(row.period_start)} - ${formatDate(row.period_end)}`
              : "N/A",
          beginMv: formatCurrency(row.begin_market_value, reportingCurrency),
          endMv: formatCurrency(row.end_market_value, reportingCurrency),
          netCashFlow: formatCurrency(row.net_cash_flow, reportingCurrency),
          fees: formatCurrency(row.fees, reportingCurrency),
          netReturn: formatPct(row.net_return_pct ?? row.portfolio_return_pct),
          grossReturn: formatPct(row.gross_return_pct),
          benchmarkReturn: formatPct(row.benchmark_return_pct),
          activeReturn: formatPct(row.active_return_pct),
          cumulativeActive: formatPct(row.cumulative_active_return_pct),
          annualizedNet: formatPct(row.annualized_net_return_pct ?? row.annualized_return_pct),
        };

        return {
          key: row.period,
          cells: columns.map((column) => cellMap[column.key] ?? "N/A"),
          className:
            row.period === presentation.selectedPeriodLabel
              ? "performance-horizon-table-row-selected"
              : undefined,
          ariaLabel: `${row.period} horizon comparison row`,
        };
      }),
    };
  }, [presentation.selectedPeriodLabel, reportingCurrency, rows, tableView]);

  return (
    <PerformanceSummaryDriverModule
      title={presentation.frame.title}
      subtitle={presentation.frame.subtitle}
      actions={
        presentation.frame.actionLabel ? (
          <Typography
            component="span"
            sx={{
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            {presentation.frame.actionLabel}
          </Typography>
        ) : null
      }
    >
      {isLoading ? (
        <p className="muted">{presentation.loadingBody}</p>
      ) : rows && rows.length > 0 ? (
        <>
          <WorkbenchChartContextRow
            className="performance-horizon-context-row"
            itemClassName="performance-mini-legend-item"
            label="Horizon comparison context"
            items={[
              {
                key: "selected-period",
                label: "Selected period",
                value: presentation.selectedPeriodLabel,
              },
              {
                key: "active-return",
                label: "Active return",
                value: presentation.activeReturnLabel,
              },
              {
                key: "benchmark",
                label: "Compared against",
                value: presentation.benchmarkLabel,
              },
            ]}
          />
          <WorkbenchSummaryToolbar className="performance-mini-legend">
            <span className="performance-mini-legend-item performance-mini-legend-portfolio">
              Portfolio
            </span>
            <span className="performance-mini-legend-item performance-mini-legend-benchmark">
              {presentation.benchmarkLegendLabel}
            </span>
            <WorkbenchSegmentedControl
              ariaLabel="Horizon table view"
              className="performance-horizon-table-view"
              value={tableView}
              onChange={setTableView}
              options={[
                { key: "combined", label: "Combined" },
                { key: "returns", label: "Returns" },
                { key: "economics", label: "Economics" },
              ]}
            />
          </WorkbenchSummaryToolbar>
          <div
            className="performance-horizon-bars workbench-summary-visual-grid"
            aria-label="Multi-horizon returns"
          >
            {rows.map((row) => (
              <WorkbenchSummaryVisualCard
                key={row.period}
                className="performance-horizon-bar-group workbench-summary-visual-card"
              >
                <div className="performance-horizon-bar-values">
                  <WorkbenchSummaryVisualMeta>{formatPct(row.portfolio_return_pct)}</WorkbenchSummaryVisualMeta>
                  <WorkbenchSummaryVisualMeta>{formatPct(row.benchmark_return_pct)}</WorkbenchSummaryVisualMeta>
                </div>
                <div className="performance-horizon-bar-track">
                  <div
                    className="performance-horizon-bar performance-horizon-bar-portfolio"
                    style={{
                      height: `${(Math.abs(row.portfolio_return_pct ?? 0) / scale) * 120}px`,
                    }}
                  />
                  <div
                    className="performance-horizon-bar performance-horizon-bar-benchmark"
                    style={{
                      height: `${(Math.abs(row.benchmark_return_pct ?? 0) / scale) * 120}px`,
                    }}
                  />
                </div>
                <WorkbenchSummaryVisualValue>{row.period}</WorkbenchSummaryVisualValue>
              </WorkbenchSummaryVisualCard>
            ))}
          </div>
          <AnalyticsTable
            ariaLabel="Multi-horizon return table"
            columns={tableModel.columns}
            rows={tableModel.rows}
            dense
            className="performance-horizon-table"
          />
        </>
      ) : (
        <p className="muted">{presentation.emptyBody}</p>
      )}
    </PerformanceSummaryDriverModule>
  );
}
