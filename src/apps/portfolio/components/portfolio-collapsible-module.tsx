"use client";

import AnalyticsModule from "@/design-system/components/analytics-module";

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
      className={className}
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
