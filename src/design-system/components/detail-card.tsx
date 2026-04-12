import type { ReactNode } from "react";

import { cx } from "../utils/cx";

export default function DetailCard({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("workbench-detail-card", className)}>
      <div className="workbench-detail-card-header portfolio-card-header">
        <div className="workbench-detail-card-heading">
          <h3 className="workbench-detail-card-title portfolio-side-card-title">{title}</h3>
          {subtitle ? (
            <p className="workbench-detail-card-subtitle portfolio-card-subtitle">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="workbench-detail-card-actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
