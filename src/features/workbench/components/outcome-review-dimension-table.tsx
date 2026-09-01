"use client";

import { AnalyticsTable, SemanticBadge } from "@/design-system";
import {
  outcomeReviewBadgeTone,
  outcomeReviewDimensionLabel,
  outcomeReviewDimensionStateLabel,
} from "@/features/workbench/outcome-review-panel-helpers";
import type { OutcomeReviewDimensionRow } from "@/features/workbench/outcome-review-view-model";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import styles from "./outcome-review.module.css";

type Props = {
  dimensions: OutcomeReviewDimensionRow[];
};

export default function OutcomeReviewDimensionTable({ dimensions }: Props) {
  return (
    <AnalyticsTable
      ariaLabel="Outcome review dimensions"
      variant="analysis"
      density="compact"
      className={styles.detailTable}
      columns={[
        { key: "dimension", label: "Dimension" },
        { key: "expected", label: MANAGE_OUTCOME_REVIEW_LABELS.expectedOutcome, align: "right" },
        { key: "realized", label: MANAGE_OUTCOME_REVIEW_LABELS.realisedOutcome, align: "right" },
        { key: "variance", label: "Variance", align: "right" },
        { key: "state", label: "State" },
      ]}
      rows={dimensions.map((row) => ({
        key: row.key,
        cells: [
          outcomeReviewDimensionLabel(row.dimension),
          row.expected,
          row.realized,
          row.variance,
          <SemanticBadge key={`${row.key}-state`} tone={outcomeReviewBadgeTone(row.state)}>
            {outcomeReviewDimensionStateLabel(row.state)}
          </SemanticBadge>,
        ],
      }))}
      emptyState={{
        title: "No dimension results returned",
        body: "The review exists, but no expected-versus-realised dimension rows are available.",
      }}
    />
  );
}
