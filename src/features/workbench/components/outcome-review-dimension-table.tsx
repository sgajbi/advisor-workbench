"use client";

import { AnalyticsTable, SemanticBadge } from "@/design-system";
import { outcomeReviewBadgeTone } from "@/features/workbench/outcome-review-panel-helpers";
import type { OutcomeReviewDimensionRow } from "@/features/workbench/outcome-review-view-model";
import { businessStateLabel } from "@/features/workbench/manage-workspace-view-model";

type Props = {
  dimensions: OutcomeReviewDimensionRow[];
};

export default function OutcomeReviewDimensionTable({ dimensions }: Props) {
  return (
    <AnalyticsTable
      ariaLabel="Outcome review dimensions"
      variant="analysis"
      density="compact"
      columns={[
        { key: "dimension", label: "Dimension" },
        { key: "expected", label: "Expected", align: "right" },
        { key: "realized", label: "Realized", align: "right" },
        { key: "variance", label: "Variance", align: "right" },
        { key: "state", label: "State" },
      ]}
      rows={dimensions.map((row) => ({
        key: row.key,
        cells: [
          businessStateLabel(row.dimension),
          row.expected,
          row.realized,
          row.variance,
          <SemanticBadge key={`${row.key}-state`} tone={outcomeReviewBadgeTone(row.state)}>
            {businessStateLabel(row.state)}
          </SemanticBadge>,
        ],
      }))}
      emptyState={{
        title: "No dimension results returned",
        body: "The review exists, but no expected-versus-realized dimension rows are available.",
      }}
    />
  );
}
