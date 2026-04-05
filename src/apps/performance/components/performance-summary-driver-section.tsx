import type { ReactNode } from "react";

import { SectionHeader } from "@/design-system";

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
      <SectionHeader title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}
