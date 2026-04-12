import type {
  PerformanceHorizonVisualCard,
  PerformanceHorizonVisualMode,
} from "./performance-analytics-table-models";

type PerformanceHorizonComparisonMatrixProps = {
  cards: PerformanceHorizonVisualCard[];
  visualMode: PerformanceHorizonVisualMode;
};

function getSupportHeader(visualMode: PerformanceHorizonVisualMode) {
  if (visualMode === "basis") {
    return {
      title: "Fee Drag / Cumulative",
      primary: "Fee Drag",
      secondary: "Cumulative",
    };
  }

  return {
    title: "Active / Cumulative",
    primary: "Active",
    secondary: "Cumulative",
  };
}

export default function PerformanceHorizonComparisonMatrix({
  cards,
  visualMode,
}: PerformanceHorizonComparisonMatrixProps) {
  const showSupportColumn = visualMode !== "relative";
  const supportHeader = getSupportHeader(visualMode);

  return (
    <div
      className={
        showSupportColumn
          ? "performance-horizon-matrix"
          : "performance-horizon-matrix performance-horizon-matrix-no-support"
      }
      aria-label="Multi-horizon returns"
    >
      <div className="performance-horizon-matrix-header" aria-hidden="true">
        <span>Period</span>
        <span>{cards[0]?.leftBarLabel ?? "Portfolio"}</span>
        <span>{cards[0]?.rightBarLabel ?? "Benchmark"}</span>
        {showSupportColumn ? (
          <div className="performance-horizon-matrix-support-header">
            <span>{supportHeader.title}</span>
            <div className="performance-horizon-matrix-support-subheader">
              <span>{supportHeader.primary}</span>
              <span>{supportHeader.secondary}</span>
            </div>
          </div>
        ) : null}
      </div>
      {cards.map((card) => (
        <div key={card.key} className="performance-horizon-matrix-row">
          <div className="performance-horizon-matrix-period">
            <strong>{card.label}</strong>
          </div>
          <div className="performance-horizon-matrix-comparison">
            <div className="performance-horizon-matrix-metric">
              <div className="performance-horizon-matrix-metric-header">
                <strong>{card.primaryValue}</strong>
              </div>
              <div className="performance-horizon-bar-track">
                <div
                  className={card.leftBarClassName}
                  style={{
                    width: `${Math.max(card.leftBarHeightPct, 2)}%`,
                  }}
                  aria-label={`${card.label} ${card.leftBarLabel}`}
                />
              </div>
            </div>
          </div>
          <div className="performance-horizon-matrix-comparison">
            <div className="performance-horizon-matrix-metric">
              <div className="performance-horizon-matrix-metric-header">
                <strong>{card.secondaryValue}</strong>
              </div>
              <div className="performance-horizon-bar-track">
                <div
                  className={card.rightBarClassName}
                  style={{
                    width: `${Math.max(card.rightBarHeightPct, 2)}%`,
                  }}
                  aria-label={`${card.label} ${card.rightBarLabel}`}
                />
              </div>
            </div>
          </div>
          {showSupportColumn ? (
            <div className="performance-horizon-matrix-support">
              {card.tertiaryValue != null ? (
                <strong aria-label={`${card.label} ${supportHeader.primary}`}>
                  {card.tertiaryValue}
                </strong>
              ) : (
                <span aria-hidden="true"> </span>
              )}
              <strong>{card.footerValue}</strong>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
