"use client";

import type { OutcomeReviewClientCommunicationBoundaryView } from "@/features/workbench/outcome-review-view-model";
import OutcomeReviewClientBoundaryCard from "./outcome-review-client-boundary-card";
import OutcomeReviewEvidenceGrid from "./outcome-review-evidence-grid";

type Props = {
  clientRationale: string;
  clientCommunicationBoundary: OutcomeReviewClientCommunicationBoundaryView | null;
  expectedSnapshotHash: string;
  realizedSnapshotHash: string;
  proofPackId: string;
  readyEvidenceCount: number;
};

export default function OutcomeReviewRationaleEvidenceSection({
  clientRationale,
  clientCommunicationBoundary,
  expectedSnapshotHash,
  realizedSnapshotHash,
  proofPackId,
  readyEvidenceCount,
}: Props) {
  return (
    <section aria-label="Outcome review rationale and evidence">
      <h4>Internal Outcome Rationale</h4>
      <div className="outcome-review-rationale">
        <p>{clientRationale}</p>
      </div>
      {clientCommunicationBoundary ? (
        <OutcomeReviewClientBoundaryCard boundary={clientCommunicationBoundary} />
      ) : null}
      <h4>Evidence Availability</h4>
      <OutcomeReviewEvidenceGrid
        expectedSnapshotHash={expectedSnapshotHash}
        realizedSnapshotHash={realizedSnapshotHash}
        proofPackId={proofPackId}
        readyEvidenceCount={readyEvidenceCount}
      />
    </section>
  );
}
