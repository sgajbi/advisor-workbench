import type { PerformanceReturnPathLegendItem } from "./performance-return-path-legend";
import styles from "./performance-return-path-single-observation-stage.module.css";

export type PerformanceReturnPathObservationTone = "portfolio" | "benchmark" | "active";

type PerformanceReturnPathSingleObservationRow = {
  key: string;
  label: string;
  valueLabel: string;
  startPct: number;
  widthPct: number;
  markerPct: number;
  tone: PerformanceReturnPathObservationTone;
};

export type PerformanceReturnPathSingleObservationPresentation = {
  observationLabel: string;
  axisMinLabel: string;
  axisMaxLabel: string;
  baselinePct: number;
  rows: PerformanceReturnPathSingleObservationRow[];
};

export default function PerformanceReturnPathSingleObservationStage({
  observation,
  legendItems,
}: {
  observation: PerformanceReturnPathSingleObservationPresentation;
  legendItems: PerformanceReturnPathLegendItem[];
}) {
  return (
    <div className={styles.stage} aria-label="Single observation comparison">
      <div className={styles.header}>
        <div className={styles.copy}>
          <span>Single published observation</span>
          <strong>{observation.observationLabel}</strong>
        </div>
        <div className={styles.legend} aria-label="Return path legend">
          {legendItems.map((item) => (
            <span
              key={item.key}
              className={`${styles.legendItem} ${styles[item.key]}`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.axis} aria-hidden="true">
        <span>{observation.axisMinLabel}</span>
        <span>0%</span>
        <span>{observation.axisMaxLabel}</span>
      </div>

      <div className={styles.rows}>
        {observation.rows.map((row) => (
          <div key={row.key} className={styles.row}>
            <div className={styles.rowCopy}>
              <span>{row.label}</span>
              <strong>{row.valueLabel}</strong>
            </div>
            <div className={styles.track} aria-hidden="true">
              <div
                className={styles.baseline}
                style={{ left: `${observation.baselinePct}%` }}
              />
              <div
                className={`${styles.fill} ${styles[row.tone]}`}
                style={{ left: `${row.startPct}%`, width: `${row.widthPct}%` }}
              />
              <div
                className={`${styles.marker} ${styles[row.tone]}`}
                style={{ left: `${row.markerPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
