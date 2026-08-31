import type { PerformanceAdvisorBriefSupportabilityItem } from "../../advisor-brief-view-model";
import { cx } from "@/design-system/utils/cx";
import PerformanceSupportabilitySummary from "../performance-supportability-summary";
import PerformanceWorkspaceSection from "../performance-workspace-section";
import styles from "./performance-advisor-brief.module.css";

const SUPPORTABILITY_TONE_CLASS = {
  danger: styles.supportabilityStateDanger,
  success: styles.supportabilityStateSuccess,
  warn: styles.supportabilityStateWarn,
} satisfies Record<PerformanceAdvisorBriefSupportabilityItem["tone"], string>;

function isWorkflowPackStateItem(item: PerformanceAdvisorBriefSupportabilityItem): boolean {
  return item.label === "Brief preparation" || item.label === "Human review";
}

function LotusSupportabilityRow({
  item,
}: {
  item: PerformanceAdvisorBriefSupportabilityItem;
}) {
  const reviewEvidence = item.reviewEvidence;

  return (
    <div
      className={styles.supportabilityRow}
      data-recorded-at={reviewEvidence?.recordedAt ?? undefined}
      data-review-state={reviewEvidence?.reviewState ?? undefined}
      data-review-supportability={reviewEvidence?.supportability ?? undefined}
      data-reviewer={reviewEvidence?.reviewer ?? undefined}
      data-testid={reviewEvidence ? "advisor-brief-human-review-evidence" : undefined}
    >
      <div className={styles.supportabilityIdentity}>
        <span className={styles.supportabilityLabel}>
          {item.label}
        </span>
        {item.detail ? (
          <span className={styles.supportabilityDetail}>
            {item.detail}
          </span>
        ) : null}
      </div>
      <span
        className={cx(
          styles.supportabilityState,
          SUPPORTABILITY_TONE_CLASS[item.tone]
        )}
      >
        <span
          aria-hidden="true"
          className={styles.supportabilityDot}
        />
        {item.value}
      </span>
    </div>
  );
}

export default function LotusSupportabilityPanel({
  items,
  reviewNotes,
  supportDetails,
}: {
  items: PerformanceAdvisorBriefSupportabilityItem[];
  reviewNotes: string[];
  supportDetails: { label: string; value: string }[];
}) {
  const readyCount = items.filter((item) => item.tone === "success").length;
  const workflowPackStateItems = items.filter(isWorkflowPackStateItem);
  const reviewItems = items.filter(
    (item) => item.tone !== "success" && !isWorkflowPackStateItem(item)
  );
  const hasVisibleSupportabilityItems =
    workflowPackStateItems.length > 0 || reviewItems.length > 0;

  return (
    <PerformanceWorkspaceSection
      ariaLabel="Adviser brief supportability"
      className={cx(
        "lotus-supportability-panel",
        styles.supportabilityPanel,
        styles.supportabilityPanel
      )}
      headingClassName={styles.sectionHeading}
      kicker="Supportability"
      title="Decision support coverage"
    >
      <PerformanceSupportabilitySummary
        className={styles.supportabilitySummary}
        items={[
          { label: "Ready modules", value: readyCount },
          { label: "Review items", value: reviewItems.length + reviewNotes.length },
        ]}
      />
      {hasVisibleSupportabilityItems ? (
        <>
          {workflowPackStateItems.length ? (
            <div className={styles.supportabilityGrid}>
              {workflowPackStateItems.map((item) => (
                <LotusSupportabilityRow key={item.label} item={item} />
              ))}
            </div>
          ) : null}
          {reviewItems.length ? (
            <div className={styles.supportabilityGrid}>
              {reviewItems.map((item) => (
                <LotusSupportabilityRow key={item.label} item={item} />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className={styles.supportabilityAllReady}>
          All current brief dependencies are ready for the selected context.
        </div>
      )}
      {reviewNotes.length ? (
        <div className={styles.supportabilityNotes}>
          {reviewNotes.map((note) => (
            <div
              key={note}
              className={styles.supportabilityNote}
            >
              {note}
            </div>
          ))}
        </div>
      ) : null}
      {supportDetails.length ? (
        <details className={styles.supportDetails}>
          <summary>Source support details</summary>
          <dl>
            {supportDetails.map((detail) => (
              <div key={`${detail.label}-${detail.value}`}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </PerformanceWorkspaceSection>
  );
}
