import AnalyticsModule from "./analytics-module";

export default function ChartCard({
  title,
  subtitle,
  actions,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AnalyticsModule title={title} subtitle={subtitle} actions={actions}>
      {children}
    </AnalyticsModule>
  );
}
