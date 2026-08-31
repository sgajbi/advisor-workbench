import { Text } from "@/design-system";
import { cx } from "@/design-system/utils/cx";
import { PERFORMANCE_WORKFLOW_LABELS } from "../../performance-terminology";

import LotusStatusBar from "./lotus-status-bar";
import styles from "./performance-advisor-brief.module.css";
import type { PerformanceAdvisorBriefStatus } from "../../advisor-brief-view-model";

export default function LotusPageHeader({
  summary,
  status,
  noteText,
  onRefresh,
  canCopy,
  refreshing,
  interactionBusy,
}: {
  summary: string;
  status: PerformanceAdvisorBriefStatus;
  noteText: string;
  onRefresh: () => void;
  canCopy: boolean;
  refreshing: boolean;
  interactionBusy: boolean;
}) {
  return (
    <header className={cx("lotus-page-header", styles.header)}>
      <div
        className={cx(
          "lotus-page-header-copy",
          styles.headerCopy,
          styles.overview
        )}
      >
        <div className={styles.overviewTopline}>
          <div className={styles.overviewCopy}>
            <Text
              as="p"
              variant="dataLabel"
              className={cx(
                "lotus-page-header-eyebrow",
                styles.eyebrow
              )}
            >
              {PERFORMANCE_WORKFLOW_LABELS.adviserBrief}
            </Text>
            <div className={cx("lotus-page-header-title-row", styles.pageHeaderTitleRow)}>
              <Text
                as="h2"
                variant="pageTitle"
                className={cx(
                  "lotus-page-header-title",
                  styles.title
                )}
              >
                Performance adviser brief
              </Text>
              <span
                className={cx("lotus-page-header-anchor", styles.pageHeaderAnchor)}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
        <Text
          as="p"
          variant="body"
          className={styles.overviewSummary}
          aria-label="Brief synopsis"
        >
          {summary}
        </Text>
        <LotusStatusBar
          status={status}
          noteText={noteText}
          onRefresh={onRefresh}
          canCopy={canCopy}
          refreshing={refreshing}
          interactionBusy={interactionBusy}
        />
      </div>
    </header>
  );
}
