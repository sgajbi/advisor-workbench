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
      <span>Retained until {retentionUntil}</span>
      <span>{sourceReferenceCount} source references</span>
    </div>
  );
}
