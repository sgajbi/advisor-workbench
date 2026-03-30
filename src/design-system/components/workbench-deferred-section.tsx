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
  children,
}: {
  title: string;
  subtitle: string;
  loadingTitle: string;
  loadingMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <AnalyticsSectionHeader title={title} subtitle={subtitle} />
      <DeferredWorkbenchMount
        placeholder={
          <DeferredModulePlaceholder title={loadingTitle} message={loadingMessage} />
        }
      >
        {children}
      </DeferredWorkbenchMount>
    </section>
  );
}
