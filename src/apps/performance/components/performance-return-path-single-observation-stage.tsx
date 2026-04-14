import type { PerformanceReturnPathLegendItem } from "./performance-return-path-legend";

type PerformanceReturnPathSingleObservationRow = {
  key: string;
  label: string;
  valueLabel: string;
  startPct: number;
  widthPct: number;
  markerPct: number;
  toneClassName: string;
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
    <div className="performance-return-path-single-observation" aria-label="Single observation comparison">
      <div className="performance-return-path-single-observation-header">
        <div className="performance-return-path-single-observation-copy">
          <span>Single published observation</span>
          <strong>{observation.observationLabel}</strong>
        </div>
        <div className="performance-return-path-single-observation-legend" aria-label="Return path legend">
          {legendItems.map((item) => (
            <span
              key={item.key}
              className={`performance-return-path-single-observation-legend-item ${item.className}`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="performance-return-path-single-observation-axis" aria-hidden="true">
        <span>{observation.axisMinLabel}</span>
        <span>0%</span>
        <span>{observation.axisMaxLabel}</span>
      </div>

      <div className="performance-return-path-single-observation-rows">
        {observation.rows.map((row) => (
          <div key={row.key} className="performance-return-path-single-observation-row">
            <div className="performance-return-path-single-observation-row-copy">
              <span>{row.label}</span>
              <strong>{row.valueLabel}</strong>
            </div>
            <div className="performance-return-path-single-observation-track" aria-hidden="true">
              <div
                className="performance-return-path-single-observation-baseline"
                style={{ left: `${observation.baselinePct}%` }}
              />
              <div
                className={`performance-return-path-single-observation-fill ${row.toneClassName}`}
                style={{ left: `${row.startPct}%`, width: `${row.widthPct}%` }}
              />
              <div
                className={`performance-return-path-single-observation-marker ${row.toneClassName}`}
                style={{ left: `${row.markerPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
