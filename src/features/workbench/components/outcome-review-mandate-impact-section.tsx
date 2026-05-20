"use client";

import type { OutcomeReviewDimensionRow } from "@/features/workbench/outcome-review-view-model";
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
      <h4>Mandate Impact</h4>
      <p>{mandateImpact}</p>
      <OutcomeReviewDimensionTable dimensions={dimensions} />
    </section>
  );
}
