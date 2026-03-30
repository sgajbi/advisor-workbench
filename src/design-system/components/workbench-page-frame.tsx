import { cx } from "../utils/cx";

import WorkbenchPageHeader from "./workbench-page-header";

export function WorkbenchPageFrame({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx("workbench-page-frame", className)}>
      <WorkbenchPageHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        className="workbench-page-frame-header"
      />
      <div className={cx("workbench-page-frame-body", bodyClassName)}>{children}</div>
    </section>
  );
}

export function WorkbenchSectionStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx("workbench-section-stack", className)}>{children}</div>;
}
