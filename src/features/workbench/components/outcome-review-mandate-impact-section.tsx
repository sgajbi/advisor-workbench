"use client";

import type { OutcomeReviewDimensionRow } from "@/features/workbench/outcome-review-view-model";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import OutcomeReviewDimensionTable from "./outcome-review-dimension-table";

type Props = {
  mandateImpact: string;
  dimensions: OutcomeReviewDimensionRow[];
};

export default function OutcomeReviewMandateImpactSection({
  mandateImpact,
  dimensions,
}: Props) {
  return (
    <section aria-label="Outcome review mandate impact">
      <h4>{MANAGE_OUTCOME_REVIEW_LABELS.mandateImpact}</h4>
      <p>{mandateImpact}</p>
      <OutcomeReviewDimensionTable dimensions={dimensions} />
    </section>
  );
}
