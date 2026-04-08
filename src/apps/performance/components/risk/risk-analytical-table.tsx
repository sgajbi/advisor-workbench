import type { ReactNode } from "react";

import { AnalyticsTable } from "@/design-system";

type RiskAnalyticalTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

type RiskAnalyticalTableRow = {
  key: string;
  cells: Array<ReactNode>;
};

export default function RiskAnalyticalTable({
  ariaLabel,
  columns,
  rows,
  emptyState,
  className,
  density = "default",
}: {
  ariaLabel: string;
  columns: RiskAnalyticalTableColumn[];
  rows: RiskAnalyticalTableRow[];
  emptyState: { title: string; body: string };
  className?: string;
  density?: "default" | "compact";
}) {
  return (
    <AnalyticsTable
      ariaLabel={ariaLabel}
      variant="analysis"
      density="compact"
      className={[
        "performance-risk-analytical-table",
        density === "compact" ? "performance-risk-analytical-table-compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      columns={columns}
      rows={rows}
      emptyState={emptyState}
    />
  );
}
