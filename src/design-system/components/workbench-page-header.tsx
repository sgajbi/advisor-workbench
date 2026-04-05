import { cx } from "../utils/cx";
import Text from "./text";

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
        <Text variant="pageTitle" className="workbench-page-header-title">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="secondary" className="workbench-page-header-subtitle">
            {subtitle}
          </Text>
        ) : null}
      </div>
      {actions ? <div className="workbench-page-header-actions">{actions}</div> : null}
    </section>
  );
}
