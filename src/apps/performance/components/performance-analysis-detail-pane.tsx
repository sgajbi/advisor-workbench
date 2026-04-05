import type { WorkbenchSegmentedControlOption } from "@/design-system";
import { cx } from "@/design-system/utils/cx";

import LotusModeTabs from "./advisor-brief/lotus-mode-tabs";

export default function PerformanceAnalysisDetailPane<T extends string>({
  title,
  subtitle,
  value,
  onChange,
  options,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<WorkbenchSegmentedControlOption<T>>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("performance-analysis-detail-pane", className)}>
      <div className="performance-analysis-detail-pane-header">
        <div className="performance-analysis-detail-pane-copy">
          <strong>{title}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        <LotusModeTabs
          value={value}
          onChange={onChange}
          options={options}
          ariaLabel={`${title} view`}
          className="performance-analysis-detail-pane-tabs"
        />
      </div>
      <div className="performance-analysis-detail-pane-body">{children}</div>
    </div>
  );
}
