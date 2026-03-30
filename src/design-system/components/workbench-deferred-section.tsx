import type { ReactNode } from "react";

import AnalyticsSectionHeader from "./analytics-section-header";
import DeferredModulePlaceholder from "./deferred-module-placeholder";
import DeferredWorkbenchMount from "./deferred-workbench-mount";

export default function WorkbenchDeferredSection({
  title,
  subtitle,
  loadingTitle,
  loadingMessage,
  className,
  deferHeader = false,
  placeholder,
  children,
}: {
  title: string;
  subtitle: string;
  loadingTitle: string;
  loadingMessage: string;
  className?: string;
  deferHeader?: boolean;
  placeholder?: ReactNode;
  children: ReactNode;
}) {
  const fallbackPlaceholder = (
    <DeferredModulePlaceholder title={loadingTitle} message={loadingMessage} />
  );

  if (deferHeader) {
    return (
      <section className={className}>
        <DeferredWorkbenchMount placeholder={placeholder}>
          <>
            <AnalyticsSectionHeader title={title} subtitle={subtitle} />
            {children}
          </>
        </DeferredWorkbenchMount>
      </section>
    );
  }

  return (
    <section className={className}>
      <AnalyticsSectionHeader title={title} subtitle={subtitle} />
      <DeferredWorkbenchMount
        placeholder={placeholder ?? fallbackPlaceholder}
      >
        {children}
      </DeferredWorkbenchMount>
    </section>
  );
}
