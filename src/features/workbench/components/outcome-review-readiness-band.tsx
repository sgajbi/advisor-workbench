"use client";

type Props = {
  reviewWindow: string;
  reportInputBlocked: boolean;
  aiEvidenceBlocked: boolean;
  sourceEvidenceStatus: string;
};

export default function OutcomeReviewReadinessBand({
  reviewWindow,
  reportInputBlocked,
  aiEvidenceBlocked,
  sourceEvidenceStatus,
}: Props) {
  return (
    <div className="outcome-review-readiness-band" aria-label="Selected outcome review readiness">
      <div>
        <span>Review Window</span>
        <strong>{reviewWindow}</strong>
      </div>
      <div>
        <span>Report Input</span>
        <strong>{reportInputBlocked ? "Blocked" : "Ready"}</strong>
      </div>
      <div>
        <span>AI Narrative</span>
        <strong>{aiEvidenceBlocked ? "Blocked" : "Ready"}</strong>
      </div>
      <div>
        <span>Source Evidence</span>
        <strong>{sourceEvidenceStatus}</strong>
      </div>
    </div>
  );
}
