import type { ReactNode } from "react";

export default function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="section-header" role="group" aria-label={`${title} section header`}>
      <div className="section-header-copy">
        <h3>{title}</h3>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {actions ? <div className="section-header-actions">{actions}</div> : null}
    </div>
  );
}
