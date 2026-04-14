import { cx } from "../utils/cx";
import Text from "./text";

export default function WorkbenchPageHeader({
  title,
  subtitle,
  actions,
  className,
  titleVariant = "pageTitle",
  subtitleVariant = "body",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  titleVariant?: "workspaceTitle" | "pageTitle";
  subtitleVariant?: "body" | "bodySmall" | "helperText";
}) {
  return (
    <section className={cx("workbench-page-header", className)}>
      <div className="workbench-page-header-copy">
        <Text variant={titleVariant} className="workbench-page-header-title">
          {title}
        </Text>
        {subtitle ? (
          <Text variant={subtitleVariant} className="workbench-page-header-subtitle">
            {subtitle}
          </Text>
        ) : null}
      </div>
      {actions ? <div className="workbench-page-header-actions">{actions}</div> : null}
    </section>
  );
}
