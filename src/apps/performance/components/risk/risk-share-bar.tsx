export default function RiskShareBar({
  value,
  absValue,
  maxAbsValue,
}: {
  value: string;
  absValue: number | null;
  maxAbsValue: number;
}) {
  const widthPct =
    absValue !== null && maxAbsValue > 0
      ? Math.max(4, Math.min(100, (absValue / maxAbsValue) * 100))
      : 0;

  return (
    <div className="performance-risk-share-bar" aria-label={`Contribution share ${value}`}>
      <span className="performance-risk-share-bar-value">{value}</span>
      {absValue !== null && maxAbsValue > 0 ? (
        <span className="performance-risk-share-bar-track" aria-hidden="true">
          <span
            className={[
              "performance-risk-share-bar-fill",
              value.trim().startsWith("-") ? "performance-risk-share-bar-fill-negative" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ width: `${widthPct}%` }}
          />
        </span>
      ) : null}
    </div>
  );
}
