import { WorkbenchChartShell } from "@/design-system";

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
    <WorkbenchChartShell
      className="performance-summary-driver-module"
      title={title}
      subtitle={subtitle}
      actions={actions}
    >
      {children}
    </WorkbenchChartShell>
  );
}
