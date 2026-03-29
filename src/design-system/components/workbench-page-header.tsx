import { cx } from "../utils/cx";

export default function WorkbenchPageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("workbench-page-header", className)}>
      <div className="workbench-page-header-copy">
        <h1 className="workbench-page-header-title">{title}</h1>
        {subtitle ? <p className="workbench-page-header-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="workbench-page-header-actions">{actions}</div> : null}
    </section>
  );
}
