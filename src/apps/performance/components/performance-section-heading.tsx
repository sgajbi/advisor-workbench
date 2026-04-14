import type { ReactNode } from "react";

export default function PerformanceSectionHeading({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const rootClassName = ["performance-section-heading", className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName}>
      <div className="performance-section-heading-copy">
        {kicker ? <span className="performance-section-heading-kicker">{kicker}</span> : null}
        <h3>{title}</h3>
        {description ? <p className="performance-section-heading-note">{description}</p> : null}
      </div>
      {actions ? <div className="performance-section-heading-actions">{actions}</div> : null}
    </div>
  );
}
