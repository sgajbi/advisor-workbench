import type {
  PerformanceChartPoint,
  PerformanceHorizonComparisonRow,
} from "@/features/workbench/types";

import { formatCurrency, formatDate, formatPct } from "../formatters";

export type PerformanceAnalyticsTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

export type PerformanceAnalyticsTableRow = {
  key: string;
  cells: string[];
  className?: string;
  ariaLabel?: string;
};

export type PerformanceAnalyticsTableModel = {
  columns: PerformanceAnalyticsTableColumn[];
  rows: PerformanceAnalyticsTableRow[];
};

export type PerformanceReturnPathTableView = "combined" | "absolute" | "relative";
export type PerformanceHorizonTableView = "combined" | "returns" | "economics";
export type PerformanceHorizonBasisView = "both" | "net" | "gross";
export type PerformanceHorizonVisualMode = "absolute" | "relative" | "basis";

export type PerformanceHorizonVisualCard = {
  key: string;
  label: string;
  primaryValue: string;
  secondaryValue: string;
  tertiaryValue?: string;
  leftBarLabel: string;
  leftBarHeightPct: number;
  leftBarClassName: string;
  rightBarLabel: string;
  rightBarHeightPct: number;
  rightBarClassName: string;
  spreadLabel: string;
  spreadValue: string;
};

const LEADING_COLUMNS: PerformanceAnalyticsTableColumn[] = [
  { key: "period", label: "Period" },
  { key: "window", label: "Window" },
];

export function buildPerformanceReturnPathTableModel({
  points,
  viewMode,
  includeBenchmarkSeries,
  includeActiveSeries,
}: {
  points: PerformanceChartPoint[];
  viewMode: PerformanceReturnPathTableView;
  includeBenchmarkSeries: boolean;
  includeActiveSeries: boolean;
}): PerformanceAnalyticsTableModel {
  const absoluteColumns: PerformanceAnalyticsTableColumn[] = [
    { key: "portfolioPeriod", label: "Portfolio", align: "right" },
    ...(includeBenchmarkSeries
      ? [{ key: "benchmarkPeriod", label: "Benchmark", align: "right" as const }]
      : []),
    { key: "portfolioCumulative", label: "Cum Portfolio", align: "right" },
    ...(includeBenchmarkSeries
      ? [{ key: "benchmarkCumulative", label: "Cum Benchmark", align: "right" as const }]
      : []),
  ];
  const relativeColumns: PerformanceAnalyticsTableColumn[] = includeActiveSeries
    ? [
        { key: "activePeriod", label: "Active", align: "right" },
        { key: "activeCumulative", label: "Cum Active", align: "right" },
      ]
    : [];
  const columns =
    viewMode === "absolute"
      ? [...LEADING_COLUMNS, ...absoluteColumns]
      : viewMode === "relative"
        ? [...LEADING_COLUMNS, ...relativeColumns]
        : [...LEADING_COLUMNS, ...absoluteColumns, ...relativeColumns];

  return {
    columns,
    rows: points.map((point) => {
      const cellMap: Record<string, string> = {
        period: point.label,
        window:
          point.period_start && point.period_end
            ? `${formatDate(point.period_start)} - ${formatDate(point.period_end)}`
            : "N/A",
        portfolioPeriod: formatPct(point.portfolio_return_pct),
        benchmarkPeriod: formatPct(point.benchmark_return_pct),
        activePeriod: formatPct(point.active_return_pct),
        portfolioCumulative: formatPct(point.cumulative_portfolio_return_pct),
        benchmarkCumulative: formatPct(point.cumulative_benchmark_return_pct),
        activeCumulative: formatPct(point.cumulative_active_return_pct),
      };

      return {
        key: point.label,
        ariaLabel: `${point.label} return path row`,
        cells: columns.map((column) => cellMap[column.key] ?? "N/A"),
      };
    }),
  };
}

export function buildPerformanceHorizonTableModel({
  rows,
  reportingCurrency,
  tableView,
  basisView,
  selectedPeriodLabel,
}: {
  rows: PerformanceHorizonComparisonRow[];
  reportingCurrency: string;
  tableView: PerformanceHorizonTableView;
  basisView: PerformanceHorizonBasisView;
  selectedPeriodLabel?: string;
}): PerformanceAnalyticsTableModel {
  const basisReturnColumns =
    basisView === "net"
      ? [
          { key: "netReturn", label: "Net", align: "right" as const },
          { key: "cumulativeNet", label: "Cum Net", align: "right" as const },
          { key: "annualizedNet", label: "Ann. Net", align: "right" as const },
        ]
      : basisView === "gross"
        ? [
            { key: "grossReturn", label: "Gross", align: "right" as const },
            { key: "cumulativeGross", label: "Cum Gross", align: "right" as const },
            { key: "annualizedGross", label: "Ann. Gross", align: "right" as const },
          ]
        : [
            { key: "netReturn", label: "Net", align: "right" as const },
            { key: "grossReturn", label: "Gross", align: "right" as const },
            { key: "feeDrag", label: "Fee Drag", align: "right" as const },
            { key: "cumulativeNet", label: "Cum Net", align: "right" as const },
            { key: "cumulativeGross", label: "Cum Gross", align: "right" as const },
            { key: "annualizedNet", label: "Ann. Net", align: "right" as const },
            { key: "annualizedGross", label: "Ann. Gross", align: "right" as const },
          ];
  const relativeColumns = [
    { key: "benchmarkReturn", label: "Benchmark", align: "right" as const },
    { key: "activeReturn", label: "Active", align: "right" as const },
    { key: "cumulativeBenchmark", label: "Cum Benchmark", align: "right" as const },
    { key: "cumulativeActive", label: "Cum Active", align: "right" as const },
  ];
  const economicsColumns = [
    { key: "beginMv", label: "Begin MV", align: "right" as const },
    { key: "endMv", label: "End MV", align: "right" as const },
    { key: "netCashFlow", label: "Net Flow", align: "right" as const },
    { key: "fees", label: "Fees", align: "right" as const },
  ];
  const columns =
    tableView === "returns"
      ? [...LEADING_COLUMNS, ...basisReturnColumns, ...relativeColumns]
      : tableView === "economics"
        ? [...LEADING_COLUMNS, ...economicsColumns]
        : [...LEADING_COLUMNS, ...economicsColumns, ...basisReturnColumns, ...relativeColumns];

  return {
    columns,
    rows: rows.map((row) => {
      const netReturn = row.net_return_pct ?? row.portfolio_return_pct;
      const annualizedNet = row.annualized_net_return_pct ?? row.annualized_return_pct;
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
        netReturn: formatPct(netReturn),
        grossReturn: formatPct(row.gross_return_pct),
        feeDrag:
          row.gross_return_pct != null && netReturn != null
            ? formatPct(row.gross_return_pct - netReturn)
            : "N/A",
        cumulativeNet: formatPct(row.cumulative_net_return_pct),
        cumulativeGross: formatPct(row.cumulative_gross_return_pct),
        benchmarkReturn: formatPct(row.benchmark_return_pct),
        activeReturn: formatPct(row.active_return_pct),
        cumulativeBenchmark: formatPct(row.cumulative_benchmark_return_pct),
        cumulativeActive: formatPct(row.cumulative_active_return_pct),
        annualizedNet: formatPct(annualizedNet),
        annualizedGross: formatPct(row.annualized_gross_return_pct),
      };

      return {
        key: row.period,
        cells: columns.map((column) => cellMap[column.key] ?? "N/A"),
        className:
          row.period === selectedPeriodLabel
            ? "performance-horizon-table-row-selected"
            : undefined,
        ariaLabel: `${row.period} horizon comparison row`,
      };
    }),
  };
}

export function buildPerformanceHorizonVisualModel({
  rows,
  basisView,
  visualMode,
}: {
  rows: PerformanceHorizonComparisonRow[];
  basisView: PerformanceHorizonBasisView;
  visualMode: PerformanceHorizonVisualMode;
}): PerformanceHorizonVisualCard[] {
  const basisValueForScale = (row: PerformanceHorizonComparisonRow) =>
    basisView === "gross"
      ? row.gross_return_pct
      : (row.net_return_pct ?? row.portfolio_return_pct);

  const scale = Math.max(
    1,
    ...rows.flatMap((row) => {
      const netReturn = row.net_return_pct ?? row.portfolio_return_pct;
      return [
        Math.abs(row.portfolio_return_pct ?? 0),
        Math.abs(row.benchmark_return_pct ?? 0),
        Math.abs(row.active_return_pct ?? 0),
        Math.abs(netReturn ?? 0),
        Math.abs(row.gross_return_pct ?? 0),
      ];
    })
  );

  return rows.map((row) => {
    const netReturn = row.net_return_pct ?? row.portfolio_return_pct;
    const grossReturn = row.gross_return_pct;
    const basisReturn = basisValueForScale(row);

    if (visualMode === "relative") {
      return {
        key: row.period,
        label: row.period,
        primaryValue: formatPct(row.active_return_pct),
        secondaryValue: `Cum ${formatPct(row.cumulative_active_return_pct)}`,
        tertiaryValue: `Benchmark ${formatPct(row.benchmark_return_pct)}`,
        leftBarLabel: "Active",
        leftBarHeightPct: Math.abs((row.active_return_pct ?? 0) / scale) * 100,
        leftBarClassName: "performance-horizon-bar performance-horizon-bar-active",
        rightBarLabel: "Cum Active",
        rightBarHeightPct: Math.abs((row.cumulative_active_return_pct ?? 0) / scale) * 100,
        rightBarClassName: "performance-horizon-bar performance-horizon-bar-active-soft",
        spreadLabel: "Spread",
        spreadValue: formatPct(row.active_return_pct),
      };
    }

    if (visualMode === "basis") {
      return {
        key: row.period,
        label: row.period,
        primaryValue: formatPct(netReturn),
        secondaryValue: `Gross ${formatPct(grossReturn)}`,
        tertiaryValue: `Cum ${formatPct(
          basisView === "gross" ? row.cumulative_gross_return_pct : row.cumulative_net_return_pct
        )}`,
        leftBarLabel: "Net",
        leftBarHeightPct: Math.abs((netReturn ?? 0) / scale) * 100,
        leftBarClassName: "performance-horizon-bar performance-horizon-bar-portfolio",
        rightBarLabel: "Gross",
        rightBarHeightPct: Math.abs((grossReturn ?? 0) / scale) * 100,
        rightBarClassName: "performance-horizon-bar performance-horizon-bar-gross",
        spreadLabel: "Fee Drag",
        spreadValue:
          grossReturn != null && netReturn != null
            ? formatPct(grossReturn - netReturn)
            : "N/A",
      };
    }

    return {
      key: row.period,
      label: row.period,
      primaryValue: formatPct(basisReturn),
      secondaryValue: `Benchmark ${formatPct(row.benchmark_return_pct)}`,
      tertiaryValue: `Cum ${formatPct(
        basisView === "gross" ? row.cumulative_gross_return_pct : row.cumulative_net_return_pct
      )}`,
      leftBarLabel: basisView === "gross" ? "Gross" : "Portfolio",
      leftBarHeightPct: Math.abs((basisReturn ?? 0) / scale) * 100,
      leftBarClassName: "performance-horizon-bar performance-horizon-bar-portfolio",
      rightBarLabel: "Benchmark",
      rightBarHeightPct: Math.abs((row.benchmark_return_pct ?? 0) / scale) * 100,
      rightBarClassName: "performance-horizon-bar performance-horizon-bar-benchmark",
      spreadLabel: "Active",
      spreadValue: formatPct(row.active_return_pct),
    };
  });
}
