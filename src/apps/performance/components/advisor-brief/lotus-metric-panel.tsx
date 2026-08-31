import { Text } from "@/design-system";
import { cx } from "@/design-system/utils/cx";

import type { PerformanceAdvisorBriefMetric } from "../../advisor-brief-view-model";
import type { PerformanceWorkspaceMode } from "../../performance-workspace-modes";
import PerformanceWorkspaceSection from "../performance-workspace-section";
import styles from "./performance-advisor-brief.module.css";

export default function LotusMetricPanel({
  metrics,
  onSelectMode,
}: {
  metrics: PerformanceAdvisorBriefMetric[];
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
}) {
  return (
    <PerformanceWorkspaceSection
      ariaLabel="Source metrics"
      className={cx("lotus-metric-panel", styles.section)}
      headingClassName={styles.sectionHeading}
      title="Key source metrics"
      description="Current performance measures supporting the brief and drill-down decisions."
    >
      <div className={styles.metricPanel}>
        {metrics.map((metric) => (
          <button
            key={metric.label}
            type="button"
            className={cx(
              "lotus-metric-panel-item",
              styles.metricCard
            )}
            onClick={() => onSelectMode(metric.targetMode)}
          >
            <Text
              as="span"
              variant="dataLabel"
              className={styles.metricLabel}
            >
              {metric.label}
            </Text>
            <div className={styles.metricRow}>
              <Text
                as="strong"
                variant="metricValueL"
                className={styles.metricValue}
              >
                {metric.value}
              </Text>
              <span
                className={styles.metricArrow}
                aria-hidden="true"
              >
                →
              </span>
            </div>
            <Text
              as="span"
              variant="bodySmall"
              className={styles.metricSupport}
            >
              {metric.supportingText}
            </Text>
          </button>
        ))}
      </div>
    </PerformanceWorkspaceSection>
  );
}
