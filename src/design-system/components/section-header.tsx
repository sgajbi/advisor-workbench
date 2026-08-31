import type { ReactNode } from "react";

import { cx } from "../utils/cx";

import Text from "./text";

export default function SectionHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const accessibleTitle =
    typeof title === "string" ? title : typeof subtitle === "string" ? subtitle : "Section";

  return (
    <div
      className={cx("section-header", className)}
      role="group"
      aria-label={`${accessibleTitle} section header`}
    >
      <div className="section-header-copy">
        <Text variant="sectionTitle">{title}</Text>
        {subtitle ? <Text variant="bodySmall">{subtitle}</Text> : null}
      </div>
      {actions ? <div className="section-header-actions">{actions}</div> : null}
    </div>
  );
}
