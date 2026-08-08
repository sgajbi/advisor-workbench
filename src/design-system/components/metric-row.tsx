import { cx } from "../utils/cx";
import styles from "./metric-row.module.css";

export default function MetricRow({
  label,
  value,
  className,
  layout = "inline",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  layout?: "inline" | "stacked";
}) {
  return (
    <div
      className={cx(
        "suite-row",
        "metric-row",
        layout === "stacked" && "metric-row-stacked",
        styles.row,
        layout === "stacked" && styles.stacked,
        className
      )}
    >
      <span className={cx("metric-row-label", styles.label)}>{label}</span>
      <strong className={cx("metric-row-value", styles.value)}>{value}</strong>
    </div>
  );
}
