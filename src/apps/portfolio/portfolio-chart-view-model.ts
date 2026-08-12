import {
  formatCurrency,
  formatDate,
  formatPct,
  formatQuantity,
} from "./formatters";
import type { PortfolioTopPosition, PortfolioWorkspace } from "./types";

export type HoldingsMetric = "market_value" | "weight";

type CashflowOutlook = NonNullable<PortfolioWorkspace["cashflow_outlook"]>;
type CashflowPoint = CashflowOutlook["upcoming_points"][number];

export type PortfolioCashflowChartPoint = {
  x: number;
  y: number;
  point: CashflowPoint;
};

export type PortfolioCashflowFlowBar = {
  projectionDate: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: "positive" | "negative";
  point: CashflowPoint;
};

export type PortfolioProjectedCashflowChartModel = {
  chartPoints: PortfolioCashflowChartPoint[];
  markerPoints: PortfolioCashflowChartPoint[];
  flowBars: PortfolioCashflowFlowBar[];
  areaPath: string;
  linePath: string;
  zeroLineY: number | null;
  positiveNetMovementCount: number;
  negativeNetMovementCount: number;
  totalPositiveNetMovement: number;
  totalNegativeNetMovement: number;
  largestPositiveNetMovement: CashflowPoint | null;
  largestNegativeNetMovement: CashflowPoint | null;
  focusPoint: CashflowPoint | null;
  focusX: number;
  focusY: number;
  flatCashflow: boolean;
};

export function buildProjectedCashflowChartModel(
  cashflowOutlook: CashflowOutlook,
): PortfolioProjectedCashflowChartModel {
  const points = cashflowOutlook.upcoming_points;
  const cumulativeValues = points.map(
    (point) => point.projected_cumulative_cashflow_base,
  );
  const flowValues = points.map((point) => point.net_cashflow_base);
  const cumulativeMin = cumulativeValues.length
    ? Math.min(...cumulativeValues)
    : 0;
  const cumulativeMax = cumulativeValues.length
    ? Math.max(...cumulativeValues)
    : 0;
  const visualPadding =
    Math.max(Math.abs(cumulativeMin), Math.abs(cumulativeMax), 1) * 0.08;
  const minValue = cumulativeMin - visualPadding;
  const maxValue = cumulativeMax + visualPadding;
  const range = Math.max(maxValue - minValue, 1);
  const maxFlow = Math.max(...flowValues.map((value) => Math.abs(value)), 1);
  const positiveNetMovementCount = flowValues.filter(
    (value) => value > 0,
  ).length;
  const negativeNetMovementCount = flowValues.filter(
    (value) => value < 0,
  ).length;
  const totalPositiveNetMovement = flowValues.reduce(
    (total, value) => total + (value > 0 ? value : 0),
    0,
  );
  const totalNegativeNetMovement = flowValues.reduce(
    (total, value) => total + (value < 0 ? value : 0),
    0,
  );
  const largestPositiveNetMovement = points.reduce<CashflowPoint | null>(
    (largest, point) => {
      if (point.net_cashflow_base <= 0) {
        return largest;
      }
      return !largest || point.net_cashflow_base > largest.net_cashflow_base
        ? point
        : largest;
    },
    null,
  );
  const largestNegativeNetMovement = points.reduce<CashflowPoint | null>(
    (largest, point) => {
      if (point.net_cashflow_base >= 0) {
        return largest;
      }
      return !largest || point.net_cashflow_base < largest.net_cashflow_base
        ? point
        : largest;
    },
    null,
  );
  const focusPoint =
    largestNegativeNetMovement ??
    largestPositiveNetMovement ??
    points.at(-1) ??
    null;
  const chartPoints = points.map((point, index) => {
    const x =
      points.length === 1 ? 28 : 28 + (index / (points.length - 1)) * 264;
    const y =
      172 -
      (((point.projected_cumulative_cashflow_base - minValue) / range) * 112 +
        24);
    return { x: roundSvg(x), y: roundSvg(y), point };
  });
  const markerPoints = chartPoints.filter(
    ({ point }, index) =>
      point.net_cashflow_base !== 0 ||
      index === 0 ||
      index === chartPoints.length - 1,
  );
  const zeroLineY =
    minValue <= 0 && maxValue >= 0
      ? roundSvg(172 - (((0 - minValue) / range) * 112 + 24))
      : null;
  const focusChartPoint = focusPoint
    ? chartPoints.find(
        (item) => item.point.projection_date === focusPoint.projection_date,
      )
    : null;

  return {
    chartPoints,
    markerPoints,
    flowBars: points.flatMap((point, index) => {
      if (point.net_cashflow_base === 0) {
        return [];
      }
      const x =
        points.length === 1 ? 28 : 28 + (index / (points.length - 1)) * 264;
      const width =
        points.length === 1
          ? 28
          : Math.max(2, Math.min(12, 188 / points.length));
      const height = (Math.abs(point.net_cashflow_base) / maxFlow) * 46;
      const flowBaselineY = 156;
      const y =
        point.net_cashflow_base >= 0 ? flowBaselineY - height : flowBaselineY;

      return [
        {
          projectionDate: point.projection_date,
          x: roundSvg(x - width / 2),
          y: roundSvg(y),
          width: roundSvg(width),
          height: roundSvg(Math.max(height, 2)),
          direction: point.net_cashflow_base >= 0 ? "positive" : "negative",
          point,
        },
      ];
    }),
    areaPath: buildAreaPath(chartPoints),
    linePath: buildLinePath(chartPoints),
    zeroLineY,
    positiveNetMovementCount,
    negativeNetMovementCount,
    totalPositiveNetMovement,
    totalNegativeNetMovement,
    largestPositiveNetMovement,
    largestNegativeNetMovement,
    focusPoint,
    focusX: focusChartPoint
      ? Math.min(Math.max(focusChartPoint.x + 8, 46), 222)
      : 152,
    focusY: focusChartPoint ? Math.max(focusChartPoint.y - 40, 12) : 24,
    flatCashflow:
      positiveNetMovementCount === 0 && negativeNetMovementCount === 0,
  };
}

export function buildTopHoldingTooltip(
  position: PortfolioTopPosition,
  metric: HoldingsMetric,
  currency: string,
): string {
  return [
    position.instrument_name,
    `Market value: ${formatCurrency(position.market_value_base, currency)}`,
    `Weight: ${formatPct(position.weight_pct)}`,
    `Quantity: ${formatQuantity(position.quantity)}`,
    `Focus metric: ${
      metric === "market_value"
        ? formatCurrency(position.market_value_base, currency)
        : formatPct(position.weight_pct)
    }`,
  ].join("\n");
}

export function buildLinePath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) {
    return "";
  }
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function buildAreaPath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) {
    return "";
  }
  const first = points[0];
  const last = points[points.length - 1];
  return [
    `M ${first.x} 164`,
    ...points.map((point) => `L ${point.x} ${point.y}`),
    `L ${last.x} 164`,
    "Z",
  ].join(" ");
}

export function formatCashflowPointTitle(
  point: CashflowPoint,
  currency: string,
): string {
  return `${formatDate(point.projection_date)}: cumulative projected movement ${formatCurrency(
    point.projected_cumulative_cashflow_base,
    currency,
  )}`;
}

export function formatCashflowNetMovementTitle(
  point: CashflowPoint,
  currency: string,
): string {
  return `${formatDate(point.projection_date)}: net movement ${formatCurrency(
    point.net_cashflow_base,
    currency,
  )}`;
}

export function roundSvg(value: number): number {
  return Number(value.toFixed(2));
}
