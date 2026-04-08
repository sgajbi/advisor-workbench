import type { ReactNode } from "react";

import { Text } from "@/design-system";

export default function RiskDetailSection({
  title,
  ariaLabel,
  toolbar,
  children,
  className,
}: {
  title: string;
  ariaLabel: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={["performance-risk-detail-section", className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
    >
      <div className="performance-risk-section-header">
        <Text variant="cardTitle" className="performance-risk-section-title">
          {title}
        </Text>
        {toolbar ? <div className="performance-risk-detail-toolbar">{toolbar}</div> : null}
      </div>
      <div className="performance-risk-detail-body">{children}</div>
    </section>
  );
}
