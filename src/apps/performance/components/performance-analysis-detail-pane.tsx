import { ModeTabs, type WorkbenchSegmentedControlOption } from "@/design-system";
import { cx } from "@/design-system/utils/cx";

export default function PerformanceAnalysisDetailPane<T extends string>({
  title,
  subtitle,
  summary,
  value,
  onChange,
  options,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  summary?: React.ReactNode;
  value: T;
  onChange: (value: T) => void;
  options: Array<WorkbenchSegmentedControlOption<T>>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("performance-analysis-detail-pane", className)}>
      <div
        className={cx(
          "performance-analysis-detail-pane-header",
          !(title || subtitle) && "performance-analysis-detail-pane-header-tabs-only"
        )}
      >
        {title || subtitle ? (
          <div className="performance-analysis-detail-pane-copy">
            {title ? <strong>{title}</strong> : null}
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
        ) : null}
        <ModeTabs
          value={value}
          onChange={onChange}
          options={options}
          ariaLabel={title ? `${title} view` : "Detail view"}
          className="performance-analysis-detail-pane-tabs"
        />
      </div>
      {summary ? <div className="performance-analysis-detail-pane-summary">{summary}</div> : null}
      <div className="performance-analysis-detail-pane-body">{children}</div>
    </div>
  );
}
