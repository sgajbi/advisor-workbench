import type { ReactNode } from "react";

export default function PerformanceModuleDisclosure({
  className,
  summaryClassName,
  copyClassName,
  titleClassName,
  title,
  meta,
  metaClassName,
  children,
}: {
  className: string;
  summaryClassName: string;
  copyClassName?: string;
  titleClassName: string;
  title: string;
  meta?: ReactNode;
  metaClassName?: string;
  children: ReactNode;
}) {
  return (
    <details className={className}>
      <summary className={summaryClassName}>
        {copyClassName ? (
          <div className={copyClassName}>
            <strong className={titleClassName}>{title}</strong>
            {meta ? <span className={metaClassName}>{meta}</span> : null}
          </div>
        ) : (
          <>
            <strong className={titleClassName}>{title}</strong>
            {meta ? <span className={metaClassName}>{meta}</span> : null}
          </>
        )}
      </summary>
      {children}
    </details>
  );
}
