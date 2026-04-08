"use client";

export default function RiskDrilldownAction({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="performance-risk-drilldown-action" onClick={onClick}>
      {label}
    </button>
  );
}
