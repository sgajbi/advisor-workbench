import { WorkbenchAnalyticsBucket } from "../types";
import { AnalyticsTable, SectionBlock } from "@/design-system";

type Props = {
  buckets: WorkbenchAnalyticsBucket[];
  groupBy: string;
};

export default function DeltaAnalyticsPanel(props: Props) {
  const rows = props.buckets;
  const dimensionLabel = props.groupBy === "ASSET_CLASS" ? "Asset Class" : "Security";

  return (
    <SectionBlock title={`Delta Analytics (${dimensionLabel})`}>
      <AnalyticsTable
        ariaLabel="Delta analytics"
        variant="analysis"
        density="comfortable"
        columns={[
          { key: "bucket", label: dimensionLabel },
          { key: "baseline", label: "Baseline Qty", align: "right" },
          { key: "proposed", label: "Proposed Qty", align: "right" },
          { key: "delta", label: "Delta Qty", align: "right" },
          { key: "current-weight", label: "Base Wgt %", align: "right" },
          { key: "proposed-weight", label: "Prop Wgt %", align: "right" },
        ]}
        rows={rows.map((row) => ({
          key: row.bucket_key,
          cells: [
            row.bucket_label,
            row.current_quantity.toFixed(4),
            row.proposed_quantity.toFixed(4),
            row.delta_quantity.toFixed(4),
            `${row.current_weight_pct.toFixed(2)}%`,
            `${row.proposed_weight_pct.toFixed(2)}%`,
          ],
        }))}
        emptyState={{
          title: "No analytics deltas available",
          body: "Delta analytics will populate once the analytics service returns bucket-level comparisons.",
        }}
      />
    </SectionBlock>
  );
}
