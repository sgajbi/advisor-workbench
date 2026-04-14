import AnalyticsModule from "./analytics-module";

import { cx } from "../utils/cx";

export default function WorkbenchDataGridFrame({
  id,
  title,
  subtitle,
  actions,
  controls,
  emptyState,
  children,
  className,
}: {
  id?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  controls?: React.ReactNode;
  emptyState?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
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
        "workbench-data-grid-frame",
        className
      )}
    >
      {controls ? <div className="workbench-data-grid-frame-controls">{controls}</div> : null}
      {children ? <div className="workbench-data-grid-frame-body">{children}</div> : emptyState}
    </AnalyticsModule>
  );
}
