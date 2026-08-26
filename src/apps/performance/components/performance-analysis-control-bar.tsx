"use client";

import type { PerformanceChartViewMode } from "./performance-chart-panel-helpers";
import PerformanceReturnViewControl from "./performance-return-view-control";
import PerformanceSourceSelectionControls, {
  type PerformanceSourceSelectionControlsProps,
} from "./performance-source-selection-controls";
import styles from "./performance-analysis-control-bar.module.css";

type PerformanceReturnViewSelection = {
  value: PerformanceChartViewMode;
  hasBenchmarkSeries: boolean;
  hasActiveSeries: boolean;
  onChange: (value: PerformanceChartViewMode) => void;
};

export type PerformanceAnalysisControlBarProps =
  PerformanceSourceSelectionControlsProps & {
    controlBarAriaLabel: string;
    returnView?: PerformanceReturnViewSelection;
  };

export default function PerformanceAnalysisControlBar({
  controlBarAriaLabel,
  returnView,
  ...sourceSelection
}: PerformanceAnalysisControlBarProps) {
  return (
    <section
      className={styles.bar}
      role="group"
      aria-label={controlBarAriaLabel}
      data-performance-analysis-control-bar="true"
    >
      <PerformanceSourceSelectionControls
        {...sourceSelection}
        presentationControl={
          returnView ? (
            <div
              className={styles.presentationSlot}
              data-performance-presentation-control-slot="true"
            >
              <PerformanceReturnViewControl {...returnView} />
            </div>
          ) : null
        }
      />
    </section>
  );
}
