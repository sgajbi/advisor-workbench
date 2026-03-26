import { cx } from "../utils/cx";

export default function MetricRow({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("suite-row", className)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
