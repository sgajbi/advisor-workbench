export default function RiskRangeIndicator({
  current,
  currentPositionPct,
  typicalPositionPct,
}: {
  current: string;
  currentPositionPct: number | null;
  typicalPositionPct: number | null;
}) {
  return (
    <div className="performance-risk-range-indicator" aria-label={`Current ${current} within observed range`}>
      <span className="performance-risk-range-indicator-value">{current}</span>
      {currentPositionPct !== null && typicalPositionPct !== null ? (
        <div className="performance-risk-range-indicator-track" aria-hidden="true">
          <span
            className="performance-risk-range-indicator-marker performance-risk-range-indicator-marker-typical"
            style={{ left: `${typicalPositionPct}%` }}
          />
          <span
            className="performance-risk-range-indicator-marker performance-risk-range-indicator-marker-current"
            style={{ left: `${currentPositionPct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
