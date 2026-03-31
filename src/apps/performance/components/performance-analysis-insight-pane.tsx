import { cx } from "@/design-system/utils/cx";

export default function PerformanceAnalysisInsightPane({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("performance-analysis-insight-pane", className)}>
      <div className="performance-analysis-insight-pane-header">
        <div className="performance-analysis-insight-pane-copy">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
      </div>
      <div className="performance-analysis-insight-pane-body">{children}</div>
    </div>
  );
}
