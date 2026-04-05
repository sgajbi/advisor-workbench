import { AnalyticsTable } from "@/design-system";
import type { ContributionSummaryView } from "@/features/workbench/types";

import {
  buildPerformanceContributionLevelTableModel,
} from "./performance-analytics-table-models";

export default function PerformanceContributionAggregateTable({
  contribution,
  level,
  ariaLabel,
  className,
  dense = true,
  rowKeyPrefix,
}: {
  contribution: ContributionSummaryView;
  level: ContributionSummaryView["levels"][number];
  ariaLabel: string;
  className?: string;
  dense?: boolean;
  rowKeyPrefix?: string;
}) {
  const tableModel = buildPerformanceContributionLevelTableModel({
    rows: level.rows,
    contribution,
    level,
  });

  return (
    <AnalyticsTable
      className={className}
      density={dense ? "compact" : "comfortable"}
      variant="analysis"
      ariaLabel={ariaLabel}
      columns={tableModel.columns}
      rows={tableModel.rows.map((row) => ({
        key: rowKeyPrefix ? `${rowKeyPrefix}-${row.key}` : row.key,
        ariaLabel: row.ariaLabel,
        cells: row.cells,
      }))}
      footer={tableModel.footer}
    />
  );
}
