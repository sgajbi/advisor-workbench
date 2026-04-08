import { AnalyticsTable } from "@/design-system";

type RiskAnalyticalTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

type RiskAnalyticalTableRow = {
  key: string;
  cells: Array<string>;
};

export default function RiskAnalyticalTable({
  ariaLabel,
  columns,
  rows,
  emptyState,
  className,
}: {
  ariaLabel: string;
  columns: RiskAnalyticalTableColumn[];
  rows: RiskAnalyticalTableRow[];
  emptyState: { title: string; body: string };
  className?: string;
}) {
  return (
    <AnalyticsTable
      ariaLabel={ariaLabel}
      variant="analysis"
      density="compact"
      className={["performance-risk-analytical-table", className].filter(Boolean).join(" ")}
      columns={columns}
      rows={rows}
      emptyState={emptyState}
    />
  );
}
