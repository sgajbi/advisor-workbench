import type {
  ContributionPositionView,
  ContributionRowView,
  ContributionSummaryView,
  PerformanceChartPoint,
  PerformanceAttributionTrendRow,
  PerformanceHorizonComparisonRow,
} from "@/features/workbench/types";

import {
  formatCurrency,
  formatDate,
  formatPct,
  formatPerformancePositionLabel,
} from "../formatters";
import {
  PERFORMANCE_ECONOMICS_LABELS,
  PERFORMANCE_RETURN_LABELS,
  PERFORMANCE_RETURN_TABLE_LABELS,
} from "../performance-terminology";
import {
  resolveActiveCumulativeReturn,
  resolveActivePeriodReturn,
} from "./performance-return-path-chart-model";

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
  footer?: string[];
};

function rightAlignedColumn(
  key: string,
  label: string
): PerformanceAnalyticsTableColumn {
  return { key, label, align: "right" };
}

export type PerformanceReturnPathTableView = "combined" | "absolute" | "relative";
export type PerformanceHorizonTableView = "combined" | "returns" | "economics";
export type PerformanceHorizonBasisView = "both" | "net" | "gross";
export type PerformanceHorizonVisualMode = "absolute" | "relative" | "basis";

function formatObservationWindow(start?: string | null, end?: string | null) {
  if (!start || !end) {
    return "N/A";
  }

  const [startDay, startMonth, startYear] = formatDate(start).split(" ");
  const [endDay, endMonth, endYear] = formatDate(end).split(" ");

  if (!startDay || !startMonth || !startYear || !endDay || !endMonth || !endYear) {
    return `${formatDate(start)} - ${formatDate(end)}`;
  }

  if (startYear === endYear) {
    return startMonth === endMonth
      ? `${startDay}-${endDay} ${endMonth} ${endYear}`
      : `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`;
  }

  return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
}

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
  footerValue: string;
};

export function buildPerformanceContributionTableModel({
  rows,
  contribution,
  level,
}: {
  rows: ContributionRowView[];
  contribution?: ContributionSummaryView | null;
  level?: ContributionSummaryView["levels"][number] | null;
}): PerformanceAnalyticsTableModel {
  const columns: PerformanceAnalyticsTableColumn[] = [
    { key: "bucket", label: "Segment" },
    { key: "contribution", label: "Contribution", align: "right" },
    { key: "weight", label: "Average weight", align: "right" },
    { key: "return", label: PERFORMANCE_RETURN_TABLE_LABELS.segmentTwr, align: "right" },
    { key: "local", label: "Local", align: "right" },
    { key: "fx", label: "FX", align: "right" },
  ];

  return {
    columns,
    rows: rows.map((row) => {
      const cellMap: Record<string, string> = {
        bucket: row.key_label,
        contribution: formatPct(row.contribution_pct),
        weight: formatPct(row.weight_avg_pct),
        return: formatPct(row.total_return_pct),
        local: formatPct(row.local_contribution_pct),
        fx: formatPct(row.fx_contribution_pct),
      };

      return {
        key: row.key_label,
        ariaLabel: `${row.key_label} contribution row`,
        cells: columns.map((column) => cellMap[column.key] ?? "N/A"),
      };
    }),
    footer:
      contribution || level
        ? [
            "Total",
            formatPct(
              contribution?.portfolio_contribution_pct ?? level?.total_contribution_pct ?? null
            ),
            formatPct(level?.total_weight_avg_pct ?? null),
            formatPct(
              level?.total_portfolio_return_pct ??
                contribution?.total_portfolio_return_pct ??
                null
            ),
            formatPct(contribution?.portfolio_local_contribution_pct ?? null),
            formatPct(contribution?.portfolio_fx_contribution_pct ?? null),
          ]
        : undefined,
  };
}

export function buildPerformanceContributionLevelTableModel({
  rows,
  contribution,
  level,
}: {
  rows: ContributionRowView[];
  contribution?: ContributionSummaryView | null;
  level?: ContributionSummaryView["levels"][number] | null;
}): PerformanceAnalyticsTableModel {
  const includeLocalFxColumns =
    contribution?.portfolio_local_contribution_pct != null ||
    contribution?.portfolio_fx_contribution_pct != null ||
    rows.some(
      (row) => row.local_contribution_pct != null || row.fx_contribution_pct != null
    );

  const columns: PerformanceAnalyticsTableColumn[] = [
    { key: "bucket", label: "Segment" },
    { key: "contribution", label: "Contribution", align: "right" },
    { key: "weight", label: "Average weight", align: "right" },
    { key: "return", label: PERFORMANCE_RETURN_TABLE_LABELS.segmentTwr, align: "right" },
    ...(includeLocalFxColumns
      ? [
          { key: "local", label: "Local", align: "right" as const },
          { key: "fx", label: "FX", align: "right" as const },
        ]
      : []),
  ];

  return {
    columns,
    rows: rows.map((row) => {
      const cellMap: Record<string, string> = {
        bucket: row.key_label,
        contribution: formatPct(row.contribution_pct),
        weight: formatPct(row.weight_avg_pct),
        return: formatPct(row.total_return_pct),
        local: formatPct(row.local_contribution_pct),
        fx: formatPct(row.fx_contribution_pct),
      };

      return {
        key: row.key_label,
        ariaLabel: `${row.key_label} contribution row`,
        cells: columns.map((column) => cellMap[column.key] ?? "N/A"),
      };
    }),
    footer: [
      "Total",
      formatPct(contribution?.portfolio_contribution_pct ?? level?.total_contribution_pct ?? null),
      formatPct(level?.total_weight_avg_pct ?? null),
      formatPct(
        level?.total_portfolio_return_pct ??
          contribution?.total_portfolio_return_pct ??
          null
      ),
      ...(includeLocalFxColumns
        ? [
            formatPct(contribution?.portfolio_local_contribution_pct ?? null),
            formatPct(contribution?.portfolio_fx_contribution_pct ?? null),
          ]
        : []),
    ],
  };
}

export function buildPerformancePositionContributionTableModel({
  rows,
}: {
  rows: ContributionPositionView[];
}): PerformanceAnalyticsTableModel {
  const includeReturnColumn = rows.some((row) => isMeaningfulValue(row.total_return_pct));
  const includeLocalFxColumns = rows.some(
    (row) => row.local_contribution_pct != null || row.fx_contribution_pct != null
  );

  const columns: PerformanceAnalyticsTableColumn[] = [
    { key: "position", label: "Position" },
    { key: "contribution", label: "Contribution", align: "right" },
    { key: "weight", label: "Average weight", align: "right" },
    ...(includeReturnColumn
      ? [
          {
            key: "return",
            label: PERFORMANCE_RETURN_TABLE_LABELS.segmentTwr,
            align: "right" as const,
          },
        ]
      : []),
    ...(includeLocalFxColumns
      ? [
          { key: "local", label: "Local", align: "right" as const },
          { key: "fx", label: "FX", align: "right" as const },
        ]
      : []),
  ];

  return {
    columns,
    rows: rows.map((row) => {
      const positionLabel = formatPerformancePositionLabel(row.position_id);
      const cellMap: Record<string, string> = {
        position: positionLabel,
        contribution: formatPct(row.contribution_pct),
        weight: formatPct(row.weight_avg_pct),
        return: formatPct(row.total_return_pct),
        local: formatPct(row.local_contribution_pct),
        fx: formatPct(row.fx_contribution_pct),
      };

      return {
        key: row.position_id,
        ariaLabel: `${positionLabel} contribution row`,
        cells: columns.map((column) => cellMap[column.key] ?? "N/A"),
      };
    }),
  };
}

function isMeaningfulValue(value: number | null | undefined): value is number {
  return value != null && Math.abs(value) > 0.000001;
}

export function buildPerformanceAttributionTrendTableModel({
  rows,
}: {
  rows: PerformanceAttributionTrendRow[];
}): PerformanceAnalyticsTableModel {
  const columns: PerformanceAnalyticsTableColumn[] = [
    { key: "period", label: "Period" },
    { key: "window", label: "Period range" },
    { key: "allocation", label: "Allocation", align: "right" },
    { key: "selection", label: "Selection", align: "right" },
    { key: "interaction", label: "Interaction", align: "right" },
    { key: "total", label: "Effect total", align: "right" },
    { key: "cumulativeTotal", label: "Cumulative effect", align: "right" },
    { key: "active", label: PERFORMANCE_RETURN_LABELS.activeReturn, align: "right" },
    { key: "residual", label: "Residual", align: "right" },
  ];

  return {
    columns,
    rows: rows.map((row) => {
      const cellMap: Record<string, string> = {
        period: row.period_label,
        window:
          row.period_start && row.period_end
            ? `${formatDate(row.period_start)} - ${formatDate(row.period_end)}`
            : "N/A",
        allocation: formatPct(row.allocation_pct),
        selection: formatPct(row.selection_pct),
        interaction: formatPct(row.interaction_pct),
        total: formatPct(row.total_effect_pct),
        cumulativeTotal: formatPct(row.cumulative_total_effect_pct),
        active: formatPct(row.active_return_pct),
        residual: formatPct(row.residual_pct),
      };

      return {
        key: row.period_label,
        ariaLabel: `${row.period_label} attribution trend row`,
        cells: columns.map((column) => cellMap[column.key] ?? "N/A"),
      };
    }),
  };
}

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
    {
      key: "portfolioPeriod",
      label: PERFORMANCE_RETURN_LABELS.portfolioTwr,
      align: "right",
    },
    ...(includeBenchmarkSeries
      ? [
          {
            key: "benchmarkPeriod",
            label: PERFORMANCE_RETURN_LABELS.benchmarkTwr,
            align: "right" as const,
          },
        ]
      : []),
    {
      key: "portfolioCumulative",
      label: PERFORMANCE_RETURN_TABLE_LABELS.cumulativePortfolioTwr,
      align: "right",
    },
    ...(includeBenchmarkSeries
      ? [
          {
            key: "benchmarkCumulative",
            label: PERFORMANCE_RETURN_TABLE_LABELS.cumulativeBenchmarkTwr,
            align: "right" as const,
          },
        ]
      : []),
  ];
  const relativeColumns: PerformanceAnalyticsTableColumn[] = includeActiveSeries
    ? [
        {
          key: "activePeriod",
          label: PERFORMANCE_RETURN_LABELS.activeReturn,
          align: "right",
        },
        {
          key: "activeCumulative",
          label: PERFORMANCE_RETURN_TABLE_LABELS.cumulativeActiveReturn,
          align: "right",
        },
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
        window: formatObservationWindow(point.period_start, point.period_end),
        portfolioPeriod: formatPct(point.portfolio_return_pct),
        benchmarkPeriod: formatPct(point.benchmark_return_pct),
        activePeriod: formatPct(resolveActivePeriodReturn(point)),
        portfolioCumulative: formatPct(point.cumulative_portfolio_return_pct),
        benchmarkCumulative: formatPct(point.cumulative_benchmark_return_pct),
        activeCumulative: formatPct(resolveActiveCumulativeReturn(point)),
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
          rightAlignedColumn("netReturn", PERFORMANCE_RETURN_TABLE_LABELS.netTwr),
          rightAlignedColumn("cumulativeNet", PERFORMANCE_RETURN_TABLE_LABELS.cumulativeNetTwr),
          rightAlignedColumn("annualizedNet", PERFORMANCE_RETURN_TABLE_LABELS.annualisedNetTwr),
        ]
      : basisView === "gross"
        ? [
            rightAlignedColumn("grossReturn", PERFORMANCE_RETURN_TABLE_LABELS.grossTwr),
            rightAlignedColumn(
              "cumulativeGross",
              PERFORMANCE_RETURN_TABLE_LABELS.cumulativeGrossTwr
            ),
            rightAlignedColumn(
              "annualizedGross",
              PERFORMANCE_RETURN_TABLE_LABELS.annualisedGrossTwr
            ),
          ]
        : [
            rightAlignedColumn("netReturn", PERFORMANCE_RETURN_TABLE_LABELS.netTwr),
            rightAlignedColumn("grossReturn", PERFORMANCE_RETURN_TABLE_LABELS.grossTwr),
            rightAlignedColumn("feeDrag", "Fee drag"),
            rightAlignedColumn("cumulativeNet", PERFORMANCE_RETURN_TABLE_LABELS.cumulativeNetTwr),
            rightAlignedColumn(
              "cumulativeGross",
              PERFORMANCE_RETURN_TABLE_LABELS.cumulativeGrossTwr
            ),
            rightAlignedColumn("annualizedNet", PERFORMANCE_RETURN_TABLE_LABELS.annualisedNetTwr),
            rightAlignedColumn(
              "annualizedGross",
              PERFORMANCE_RETURN_TABLE_LABELS.annualisedGrossTwr
            ),
          ];
  const relativeColumns = [
    rightAlignedColumn("benchmarkReturn", PERFORMANCE_RETURN_LABELS.benchmarkTwr),
    rightAlignedColumn("activeReturn", PERFORMANCE_RETURN_LABELS.activeReturn),
    rightAlignedColumn(
      "cumulativeBenchmark",
      PERFORMANCE_RETURN_TABLE_LABELS.cumulativeBenchmarkTwr
    ),
    rightAlignedColumn(
      "cumulativeActive",
      PERFORMANCE_RETURN_TABLE_LABELS.cumulativeActiveReturn
    ),
  ];
  const economicsColumns = [
    rightAlignedColumn("beginMv", PERFORMANCE_ECONOMICS_LABELS.openingMarketValue),
    rightAlignedColumn("beginningCashFlow", PERFORMANCE_ECONOMICS_LABELS.openingCashFlow),
    rightAlignedColumn("endMv", PERFORMANCE_ECONOMICS_LABELS.endingMarketValue),
    rightAlignedColumn("endingCashFlow", PERFORMANCE_ECONOMICS_LABELS.closingCashFlow),
    rightAlignedColumn(
      "flowAdjustedEndMv",
      PERFORMANCE_ECONOMICS_LABELS.flowAdjustedMarketValue
    ),
    rightAlignedColumn("netCashFlow", PERFORMANCE_ECONOMICS_LABELS.netCashFlow),
    rightAlignedColumn("fees", "Fees"),
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
        beginningCashFlow: formatCurrency(row.beginning_cash_flow, reportingCurrency),
        endMv: formatCurrency(row.end_market_value, reportingCurrency),
        endingCashFlow: formatCurrency(row.ending_cash_flow, reportingCurrency),
        flowAdjustedEndMv: formatCurrency(row.flow_adjusted_end_market_value, reportingCurrency),
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
        secondaryValue: formatPct(row.benchmark_return_pct),
        tertiaryValue: formatPct(row.cumulative_active_return_pct),
        leftBarLabel: "Active",
        leftBarHeightPct: Math.abs((row.active_return_pct ?? 0) / scale) * 100,
        leftBarClassName: "performance-horizon-bar performance-horizon-bar-active",
        rightBarLabel: "Cumulative",
        rightBarHeightPct: Math.abs((row.cumulative_active_return_pct ?? 0) / scale) * 100,
        rightBarClassName: "performance-horizon-bar performance-horizon-bar-active-soft",
        footerValue: formatPct(row.cumulative_active_return_pct),
      };
    }

    if (visualMode === "basis") {
      return {
        key: row.period,
        label: row.period,
        primaryValue: formatPct(netReturn),
        secondaryValue: formatPct(grossReturn),
        tertiaryValue:
          grossReturn != null && netReturn != null ? formatPct(grossReturn - netReturn) : "N/A",
        leftBarLabel: "Net",
        leftBarHeightPct: Math.abs((netReturn ?? 0) / scale) * 100,
        leftBarClassName: "performance-horizon-bar performance-horizon-bar-portfolio",
        rightBarLabel: "Gross",
        rightBarHeightPct: Math.abs((grossReturn ?? 0) / scale) * 100,
        rightBarClassName: "performance-horizon-bar performance-horizon-bar-gross",
        footerValue: formatPct(
          basisView === "gross" ? row.cumulative_gross_return_pct : row.cumulative_net_return_pct
        ),
      };
    }

    return {
      key: row.period,
        label: row.period,
        primaryValue: formatPct(basisReturn),
        secondaryValue: formatPct(row.benchmark_return_pct),
        tertiaryValue: formatPct(row.active_return_pct),
        leftBarLabel: basisView === "gross" ? "Gross" : "Portfolio",
        leftBarHeightPct: Math.abs((basisReturn ?? 0) / scale) * 100,
        leftBarClassName: "performance-horizon-bar performance-horizon-bar-portfolio",
        rightBarLabel: "Benchmark",
        rightBarHeightPct: Math.abs((row.benchmark_return_pct ?? 0) / scale) * 100,
        rightBarClassName: "performance-horizon-bar performance-horizon-bar-benchmark",
        footerValue: formatPct(
          basisView === "gross" ? row.cumulative_gross_return_pct : row.cumulative_net_return_pct
        ),
    };
  });
}
