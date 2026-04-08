import type { ReactNode } from "react";

import { SectionBlock } from "@/design-system";

export default function RiskModuleShell({
  title,
  actions,
  headlineMetrics,
  detail,
  context,
  className,
  priority = "primary",
  density = "default",
}: {
  title: string;
  actions?: ReactNode;
  headlineMetrics?: ReactNode;
  detail?: ReactNode;
  context?: ReactNode;
  className?: string;
  priority?: "primary" | "secondary";
  density?: "default" | "compact";
}) {
  return (
    <SectionBlock
      title={title}
      actions={actions}
      className={[
        "performance-risk-panel",
        "performance-risk-module-shell",
        `performance-risk-module-shell-${priority}`,
        density === "compact" ? "performance-risk-module-shell-compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
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
