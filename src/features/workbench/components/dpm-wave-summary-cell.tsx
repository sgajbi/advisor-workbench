type Props = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn" | "danger";
};

export default function DpmWaveSummaryCell({ label, value, tone = "default" }: Props) {
  return (
    <div className={`rebalance-summary-cell rebalance-summary-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
