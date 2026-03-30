import { AnalyticsModule } from "@/design-system";

export default function PerformanceSummaryDriverModule({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AnalyticsModule
      className="workbench-summary-card-compact workbench-summary-module-card performance-summary-module-card performance-summary-driver-module"
      compact
      title={title}
      subtitle={subtitle}
      actions={actions}
    >
      {children}
    </AnalyticsModule>
  );
}
