import type { ReactNode } from "react";

import PerformanceSectionHeading from "./performance-section-heading";

export default function PerformanceWorkspaceSection({
  ariaLabel,
  className,
  headingClassName,
  kicker,
  title,
  description,
  actions,
  children,
}: {
  ariaLabel?: string;
  className?: string;
  headingClassName?: string;
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={className} aria-label={ariaLabel}>
      <PerformanceSectionHeading
        className={headingClassName}
        kicker={kicker}
        title={title}
        description={description}
        actions={actions}
      />
      {children}
    </section>
  );
}
