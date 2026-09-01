"use client";

import { businessStateLabel } from "@/copy/business-state-copy";
import { AnalyticsTable, SemanticBadge } from "@/design-system";
import type { OutcomeReviewListItem } from "@/features/workbench/outcome-review-view-model";
import { outcomeReviewBadgeTone } from "@/features/workbench/outcome-review-panel-helpers";

import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import styles from "./outcome-review.module.css";

type Props = {
  items: OutcomeReviewListItem[];
};

export default function OutcomeReviewTimelineCard({ items }: Props) {
  return (
    <div className={`${styles.card} ${styles.timelineCard}`}>
      <div className={styles.cardHeader}>
        <h3>{MANAGE_OUTCOME_REVIEW_LABELS.reviewTimeline}</h3>
        <span>{items.length} returned</span>
      </div>
      <AnalyticsTable
        ariaLabel="Outcome reviews"
        variant="portfolio"
        density="compact"
        className={styles.table}
        scrollRegionLabel="Outcome review timeline"
        columns={[
          { key: "review", label: "Review" },
          { key: "window", label: "Window" },
          { key: "outcome", label: "Outcome" },
          { key: "state", label: "Status" },
          { key: "evidence", label: "Evidence" },
        ]}
        rows={items.map((item) => ({
          key: item.outcomeReviewId,
          cells: [
            item.reviewLabel,
            item.reviewWindow,
            item.outcomeStatusLabel,
            <SemanticBadge key={`${item.outcomeReviewId}-state`} tone={outcomeReviewBadgeTone(item.state)}>
              {businessStateLabel(item.state)}
            </SemanticBadge>,
            item.proofPackId !== "N/A" ? "Available" : "Not available",
          ],
        }))}
        emptyState={{
          title: "No outcome reviews returned",
          body: "No outcome review rows are currently available for this portfolio.",
        }}
      />
    </div>
  );
}
