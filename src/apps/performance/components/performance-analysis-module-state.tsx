import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

import PerformanceCapabilityNotice from "./performance-capability-notice";

export default function PerformanceAnalysisModuleState({
  capability,
  isDetailsPending,
  loadingText,
  partialTitle,
  unavailableTitle,
  body,
  hint,
  children,
}: {
  capability: WorkspaceCapability;
  isDetailsPending: boolean;
  loadingText: string;
  partialTitle: string;
  unavailableTitle: string;
  body: string;
  hint?: string;
  children: React.ReactNode;
}) {
  if (capability.state === "supported") {
    return <>{children}</>;
  }

  if (isDetailsPending) {
    return <p className="muted performance-analysis-loading-copy">{loadingText}</p>;
  }

  return (
    <PerformanceCapabilityNotice
      capability={capability}
      partialTitle={partialTitle}
      unavailableTitle={unavailableTitle}
      body={body}
      hint={hint}
    />
  );
}
