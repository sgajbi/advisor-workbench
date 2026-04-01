import type { ReactNode } from "react";

import { AnalyticsSectionHeader } from "@/design-system";

export default function PerformanceSummaryDriverSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="performance-summary-driver-section">
      <AnalyticsSectionHeader title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}
