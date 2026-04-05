import { cx } from "../utils/cx";
import Text from "./text";

export type WorkbenchSummaryMetricStripItem = {
  key?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  support?: React.ReactNode;
  unavailable?: boolean;
  className?: string;
};

export default function WorkbenchSummaryMetricStrip({
  items,
  className,
  itemClassName,
  ariaLabel,
}: {
  items: WorkbenchSummaryMetricStripItem[];
  className?: string;
  itemClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className={cx("workbench-summary-metric-strip", className)}
      aria-label={ariaLabel}
    >
      {items.map((item, index) => (
        <div
          key={item.key ?? `${String(item.label)}-${index}`}
          className={cx(
            "workbench-summary-metric-card",
            item.unavailable && "workbench-summary-metric-card-unavailable",
            itemClassName,
            item.className
          )}
        >
          <Text variant="label" className="workbench-summary-metric-label">
            {item.label}
          </Text>
          <Text variant="metricValueCompact" className="workbench-summary-metric-value">
            {item.value}
          </Text>
          {item.support ? (
            <Text variant="metadata" className="workbench-summary-metric-support">
              {item.support}
            </Text>
          ) : null}
        </div>
      ))}
    </div>
  );
}
