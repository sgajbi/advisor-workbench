"use client";

import { AnalyticsModule, DisclosureToggleButton } from "@/design-system";
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
        <DisclosureToggleButton expanded={expanded} onToggle={onToggle} />
      }
    >
      {expanded ? children : null}
    </AnalyticsModule>
  );
}
