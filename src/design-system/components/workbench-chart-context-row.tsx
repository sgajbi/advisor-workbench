import { WorkbenchSummaryToolbar } from "./workbench-summary-visual";

import { cx } from "../utils/cx";

export type WorkbenchChartContextRowItem = {
  key?: string;
  label: React.ReactNode;
  value: React.ReactNode;
};

export default function WorkbenchChartContextRow({
  items,
  label = "Chart context",
  className,
  itemClassName,
}: {
  items: WorkbenchChartContextRowItem[];
  label?: string;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <WorkbenchSummaryToolbar
      className={cx("workbench-chart-context-row", className)}
      role="group"
      aria-label={label}
    >
      {items.map((item, index) => (
        <span
          key={item.key ?? `${String(item.label)}-${index}`}
          className={cx("workbench-chart-context-row-item", itemClassName)}
        >
          <span className="workbench-chart-context-row-label">{item.label}</span>
          <strong className="workbench-chart-context-row-value">{item.value}</strong>
        </span>
      ))}
    </WorkbenchSummaryToolbar>
  );
}
