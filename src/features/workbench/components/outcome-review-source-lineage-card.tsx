import { SemanticBadge } from "@/design-system";
import type { OutcomeReviewSourceBoundary } from "@/features/workbench/outcome-review-view-model";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import styles from "./outcome-review.module.css";

type Props = {
  boundary: OutcomeReviewSourceBoundary;
};

export default function OutcomeReviewSourceLineageCard({ boundary }: Props) {
  const hasFacets =
    boundary.sourceOwnerFacets.length > 0 ||
    boundary.sourceTypeFacets.length > 0 ||
    boundary.supportBoundary.length > 0 ||
    boundary.appliedFilters.length > 0;
  if (!hasFacets) {
    return null;
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.sourceHeading}>
          <span>{MANAGE_OUTCOME_REVIEW_LABELS.evidenceSources}</span>
          <strong>{MANAGE_OUTCOME_REVIEW_LABELS.recordedEvidenceProfile}</strong>
        </div>
        <SemanticBadge tone="default">
          {MANAGE_OUTCOME_REVIEW_LABELS.sourceRecorded}
        </SemanticBadge>
      </div>

      <details className={styles.sourceProfile}>
        <summary>View source profile</summary>
        <FacetGroup title="Source owners" values={boundary.sourceOwnerFacets} />
        <FacetGroup title="Source types" values={boundary.sourceTypeFacets} />
        <TextGroup title="Applied filters" values={boundary.appliedFilters} />
        <TextGroup title="Support boundary" values={boundary.supportBoundary} />
      </details>
    </div>
  );
}

function FacetGroup({
  title,
  values,
}: {
  title: string;
  values: { key: string; label: string; count: string }[];
}) {
  if (values.length === 0) {
    return null;
  }
  return (
    <div className={styles.actionStack}>
      <span className={styles.mutedLabel}>{title}</span>
      {values.map((value) => (
        <div className={styles.actionItem} key={value.key}>
          <span>{value.label}</span>
          <strong>{value.count}</strong>
        </div>
      ))}
    </div>
  );
}

function TextGroup({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) {
    return null;
  }
  return (
    <div className={styles.actionStack}>
      <span className={styles.mutedLabel}>{title}</span>
      {values.slice(0, 6).map((value) => (
        <div className={styles.actionItem} key={`${title}-${value}`}>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}
