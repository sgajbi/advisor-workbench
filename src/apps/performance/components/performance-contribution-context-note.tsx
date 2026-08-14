import type { ContributionSummaryView } from "@/features/workbench/types";

import { cx } from "@/design-system/utils/cx";

import { getContributionEvidencePresentation } from "./performance-contribution-evidence-presentation";
import PerformanceModuleDisclosure from "./performance-module-disclosure";
import styles from "./performance-contribution-context-note.module.css";

export default function PerformanceContributionContextNote({
  contribution,
  className,
  showReconciliation = true,
}: {
  contribution: ContributionSummaryView;
  className?: string;
  showReconciliation?: boolean;
}) {
  const presentation = getContributionEvidencePresentation(contribution);
  const evidenceItems = showReconciliation
    ? presentation.evidenceItems
    : presentation.evidenceItems.filter((item) => item.label !== "Reconciliation");

  return (
    <div
      className={cx(styles.root, className)}
      data-tone={presentation.tone}
      data-testid="performance-contribution-evidence"
      role="note"
    >
      <div className={styles.decision}>
        <span className={styles.eyebrow}>Advisor use</span>
        <strong className={styles.title}>{presentation.title}</strong>
        <p className={styles.body}>{presentation.body}</p>
        <p className={styles.context}>{presentation.context}</p>
        {presentation.limitations.length > 0 ? (
          <ul className={styles.limitations} aria-label="Contribution evidence limitations">
            {presentation.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <PerformanceModuleDisclosure
        className={styles.disclosure}
        summaryClassName={styles.summary}
        titleClassName={styles.summaryTitle}
        title="Calculation evidence"
        meta={`${evidenceItems.length} evidence fields`}
        metaClassName={styles.summaryMeta}
      >
        <dl className={styles.evidenceGrid} aria-label="Contribution calculation evidence">
          {evidenceItems.map((item) => (
            <div className={styles.evidenceItem} key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </PerformanceModuleDisclosure>
    </div>
  );
}
