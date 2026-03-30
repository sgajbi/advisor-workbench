"use client";

import AnalyticsModule from "@/design-system/components/analytics-module";
import { cx } from "@/design-system/utils/cx";

export default function PortfolioCollapsibleModule({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
  className,
  compact = false,
}: {
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <AnalyticsModule
      className={cx(
        compact && "workbench-summary-card-compact",
        compact && "workbench-summary-module-card",
        className
      )}
      compact={compact}
      title={title}
      subtitle={subtitle}
      actions={
        <button
          type="button"
          className="portfolio-inline-action"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      }
    >
      {expanded ? children : null}
    </AnalyticsModule>
  );
}
