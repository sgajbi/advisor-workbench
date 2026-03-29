import AnalyticsModule from "./analytics-module";

export default function DataGridCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AnalyticsModule>{children}</AnalyticsModule>;
}
