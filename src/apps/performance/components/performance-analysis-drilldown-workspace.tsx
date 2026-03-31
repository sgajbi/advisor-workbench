import { cx } from "@/design-system/utils/cx";

export default function PerformanceAnalysisDrilldownWorkspace({
  className,
  insightPane,
  detailPane,
}: {
  className?: string;
  insightPane: React.ReactNode;
  detailPane: React.ReactNode;
}) {
  return (
    <div className={cx("performance-analysis-drilldown-workspace", className)}>
      <aside className="performance-analysis-drilldown-pane performance-analysis-drilldown-pane-insight">
        {insightPane}
      </aside>
      <section className="performance-analysis-drilldown-pane performance-analysis-drilldown-pane-detail">
        {detailPane}
      </section>
    </div>
  );
}
