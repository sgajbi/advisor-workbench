"use client";

import styles from "./outcome-review.module.css";

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
    <div className={styles.detailContext} aria-label="Selected review evidence status">
      <span>Updated {updatedAt}</span>
      <span>Retained until {retentionUntil}</span>
      <span>{sourceReferenceCount} source references</span>
    </div>
  );
}
