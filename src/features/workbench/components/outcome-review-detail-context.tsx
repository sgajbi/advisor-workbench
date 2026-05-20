"use client";

type Props = {
  updatedAt: string;
  retentionUntil: string;
  sourceReferenceCount: number;
};

export default function OutcomeReviewDetailContext({
  updatedAt,
  retentionUntil,
  sourceReferenceCount,
}: Props) {
  return (
    <div className="outcome-review-detail-context" aria-label="Selected review source posture">
      <span>Updated {updatedAt}</span>
      <span>Retention {retentionUntil}</span>
      <span>{sourceReferenceCount} source refs</span>
    </div>
  );
}
