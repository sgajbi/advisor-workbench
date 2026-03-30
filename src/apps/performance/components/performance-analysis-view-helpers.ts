import type { WorkbenchRankedBarRow } from "@/design-system";
import type { AttributionRowView } from "@/features/workbench/types";

import { formatCompactPct, formatLabel, formatPct } from "../formatters";

type AttributionRankingRow = AttributionRowView & {
  total_effect_pct: number;
};

export function getAttributionRankingRows(
  rows: AttributionRankingRow[]
): WorkbenchRankedBarRow[] {
  return rows.map((row) => ({
    key: `effect-ranking-${row.key_label}`,
    title: formatLabel(row.key_label),
    subtitle: `Alloc ${formatCompactPct(row.allocation_pct)} / Select ${formatCompactPct(
      row.selection_pct
    )}`,
    value: formatPct(row.total_effect_pct),
    magnitudePct: Math.abs(row.total_effect_pct),
    tone: row.total_effect_pct >= 0 ? "positive" : "negative",
  }));
}
