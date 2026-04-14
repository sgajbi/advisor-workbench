import AnalyticsModule from "./analytics-module";

import { cx } from "../utils/cx";

export default function WorkbenchChartShell({
  title,
  subtitle,
  actions,
  contextRow,
  toolbar,
  metricStrip,
  loadingState,
  fallbackState,
  children,
  className,
  bodyClassName,
  id,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  contextRow?: React.ReactNode;
  toolbar?: React.ReactNode;
  metricStrip?: React.ReactNode;
  loadingState?: React.ReactNode;
  fallbackState?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  const body = children ?? fallbackState ?? loadingState ?? null;

  return (
    <AnalyticsModule
      id={id}
      compact
      surface="primary"
      title={title}
      subtitle={subtitle}
      actions={actions}
      className={cx(
        "workbench-summary-card-compact",
        "workbench-summary-module-card",
        "workbench-chart-shell",
        className
      )}
    >
      {contextRow ? (
        <div className="workbench-chart-shell-context">{contextRow}</div>
      ) : null}
      {toolbar ? <div className="workbench-chart-shell-toolbar">{toolbar}</div> : null}
      {metricStrip ? (
        <div className="workbench-chart-shell-metrics">{metricStrip}</div>
      ) : null}
      {body ? (
        <div className={cx("workbench-chart-shell-body", bodyClassName)}>{body}</div>
      ) : null}
    </AnalyticsModule>
  );
}
