import type { ReactNode } from "react";

export default function PerformanceModuleDisclosure({
  className,
  summaryClassName,
  titleClassName,
  title,
  children,
}: {
  className: string;
  summaryClassName: string;
  titleClassName: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <details className={className}>
      <summary className={summaryClassName}>
        <strong className={titleClassName}>{title}</strong>
      </summary>
      {children}
    </details>
  );
}
