"use client";

import { FieldLabel, WorkbenchChoiceGroup } from "@/design-system";

import type { PerformanceChartViewMode } from "./performance-chart-panel-helpers";
import choiceStyles from "./performance-choice-groups.module.css";
import styles from "./performance-return-view-control.module.css";

export default function PerformanceReturnViewControl({
  value,
  hasBenchmarkSeries,
  hasActiveSeries,
  onChange,
}: {
  value: PerformanceChartViewMode;
  hasBenchmarkSeries: boolean;
  hasActiveSeries: boolean;
  onChange: (value: PerformanceChartViewMode) => void;
}) {
  return (
    <div className={styles.panel} role="group" aria-label="Return-path presentation">
      <FieldLabel>Return view</FieldLabel>
      <WorkbenchChoiceGroup
        ariaLabel="Return view"
        className={choiceStyles.horizon}
        density="compact"
        value={value}
        onChange={onChange}
        options={[
          { key: "combined", label: "Combined", disabled: !hasBenchmarkSeries },
          { key: "absolute", label: "Absolute" },
          {
            key: "relative",
            label: "Relative",
            disabled: !hasActiveSeries,
            title: hasActiveSeries
              ? undefined
              : "Relative comparison requires benchmark-relative observations.",
          },
        ]}
      />
    </div>
  );
}
