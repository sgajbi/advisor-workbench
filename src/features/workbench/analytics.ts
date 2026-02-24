import { WorkbenchPositionView, WorkbenchProjectedPositionView } from "./types";

export type AnalyticsGroupBy = "ASSET_CLASS" | "SECURITY";

export type DeltaAnalyticsRow = {
  key: string;
  label: string;
  baselineQuantity: number;
  proposedQuantity: number;
  deltaQuantity: number;
  baselineWeightPct: number;
  proposedWeightPct: number;
};

const BENCHMARK_FALLBACK_RETURNS: Record<string, number> = {
  MODEL_60_40: 3.1,
  MSCI_ACWI: 4.2,
  CUSTOM: 2.8,
};

export function resolveBenchmarkReturn(
  benchmarkCode: string,
  upstreamBenchmarkReturn: number | null | undefined
): number {
  if (typeof upstreamBenchmarkReturn === "number") {
    return upstreamBenchmarkReturn;
  }
  return BENCHMARK_FALLBACK_RETURNS[benchmarkCode] ?? 0;
}

export function buildDeltaAnalyticsRows(
  currentPositions: WorkbenchPositionView[],
  projectedPositions: WorkbenchProjectedPositionView[],
  groupBy: AnalyticsGroupBy
): DeltaAnalyticsRow[] {
  const sourceRows =
    projectedPositions.length > 0
      ? projectedPositions.map((item) => ({
          security_id: item.security_id,
          instrument_name: item.instrument_name,
          asset_class: item.asset_class,
          baseline_quantity: item.baseline_quantity,
          proposed_quantity: item.proposed_quantity,
        }))
      : currentPositions.map((item) => ({
          security_id: item.security_id,
          instrument_name: item.instrument_name,
          asset_class: item.asset_class,
          baseline_quantity: item.quantity,
          proposed_quantity: item.quantity,
        }));

  const baselineTotal = sourceRows.reduce((acc, item) => acc + item.baseline_quantity, 0);
  const proposedTotal = sourceRows.reduce((acc, item) => acc + item.proposed_quantity, 0);

  const aggregate = new Map<string, DeltaAnalyticsRow>();
  for (const item of sourceRows) {
    const key =
      groupBy === "ASSET_CLASS"
        ? item.asset_class?.toUpperCase() ?? "UNCLASSIFIED"
        : item.security_id;
    const label = groupBy === "ASSET_CLASS" ? key : item.instrument_name;
    const existing = aggregate.get(key) ?? {
      key,
      label,
      baselineQuantity: 0,
      proposedQuantity: 0,
      deltaQuantity: 0,
      baselineWeightPct: 0,
      proposedWeightPct: 0,
    };
    existing.baselineQuantity += item.baseline_quantity;
    existing.proposedQuantity += item.proposed_quantity;
    existing.deltaQuantity = existing.proposedQuantity - existing.baselineQuantity;
    aggregate.set(key, existing);
  }

  const rows = Array.from(aggregate.values()).map((item) => ({
    ...item,
    baselineWeightPct: baselineTotal > 0 ? (item.baselineQuantity / baselineTotal) * 100 : 0,
    proposedWeightPct: proposedTotal > 0 ? (item.proposedQuantity / proposedTotal) * 100 : 0,
  }));

  rows.sort((a, b) => Math.abs(b.deltaQuantity) - Math.abs(a.deltaQuantity));
  return rows;
}
