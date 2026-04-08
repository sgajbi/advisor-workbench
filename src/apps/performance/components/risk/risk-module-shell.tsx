import type { ReactNode } from "react";

import { SectionBlock } from "@/design-system";

export default function RiskModuleShell({
  title,
  subtitle,
  actions,
  businessReading,
  headlineMetrics,
  detail,
  context,
  className,
  priority = "primary",
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  businessReading?: ReactNode;
  headlineMetrics?: ReactNode;
  detail?: ReactNode;
  context?: ReactNode;
  className?: string;
  priority?: "primary" | "secondary";
}) {
  return (
    <SectionBlock
      title={title}
      subtitle={subtitle}
      actions={actions}
      className={[
        "performance-risk-panel",
        "performance-risk-module-shell",
        `performance-risk-module-shell-${priority}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {businessReading}
      {headlineMetrics}
      {detail || context ? (
        <div className="performance-risk-module-body">
          {detail ? <div className="performance-risk-module-main">{detail}</div> : null}
          {context ? <div className="performance-risk-module-side">{context}</div> : null}
        </div>
      ) : null}
    </SectionBlock>
  );
}
