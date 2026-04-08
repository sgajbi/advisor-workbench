import type { ReactNode } from "react";

import { Text } from "@/design-system";

export default function RiskDetailSection({
  title,
  ariaLabel,
  toolbar,
  children,
  className,
  density = "default",
}: {
  title?: string;
  ariaLabel: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  density?: "default" | "compact";
}) {
  return (
    <section
      className={[
        "performance-risk-detail-section",
        density === "compact" ? "performance-risk-detail-section-compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
    >
      {title || toolbar ? (
        <div className="performance-risk-section-header">
          {title ? (
            <Text variant="cardTitle" className="performance-risk-section-title">
              {title}
            </Text>
          ) : (
            <div />
          )}
          {toolbar ? <div className="performance-risk-detail-toolbar">{toolbar}</div> : null}
        </div>
      ) : null}
      <div className="performance-risk-detail-body">{children}</div>
    </section>
  );
}
