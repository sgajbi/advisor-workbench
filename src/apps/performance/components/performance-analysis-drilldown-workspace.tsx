import { cx } from "@/design-system/utils/cx";

export default function PerformanceAnalysisDrilldownWorkspace({
  className,
  insightPane,
  detailPane,
  insightLabel = "Performance highlights panel",
  detailLabel = "Performance detail panel",
}: {
  className?: string;
  insightPane: React.ReactNode;
  detailPane: React.ReactNode;
  insightLabel?: string;
  detailLabel?: string;
}) {
  return (
    <div className={cx("performance-analysis-drilldown-workspace", className)}>
      <aside
        aria-label={insightLabel}
        className="performance-analysis-drilldown-pane performance-analysis-drilldown-pane-insight"
      >
        {insightPane}
      </aside>
      <section
        aria-label={detailLabel}
        className="performance-analysis-drilldown-pane performance-analysis-drilldown-pane-detail"
      >
        {detailPane}
      </section>
    </div>
  );
}
