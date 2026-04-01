import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

import PerformanceAnalysisStatePanel from "./performance-analysis-state-panel";

export default function PerformanceAnalysisModuleState({
  capability,
  isDetailsPending,
  loadingText,
  partialTitle,
  unavailableTitle,
  body,
  hint,
  allowPartialContent = false,
  children,
}: {
  capability: WorkspaceCapability;
  isDetailsPending: boolean;
  loadingText: string;
  partialTitle: string;
  unavailableTitle: string;
  body: string;
  hint?: string;
  allowPartialContent?: boolean;
  children: React.ReactNode;
}) {
  if (capability.state === "supported") {
    return <>{children}</>;
  }

  if (isDetailsPending) {
    return (
      <PerformanceAnalysisStatePanel
        state="loading"
        title="Loading detail"
        body={loadingText}
      />
    );
  }

  if (capability.state === "partial" && allowPartialContent) {
    return (
      <>
        <PerformanceAnalysisStatePanel
          state="partial"
          title={partialTitle}
          body={body}
          hint={hint}
        />
        {children}
      </>
    );
  }

  return (
    <PerformanceAnalysisStatePanel
      state={capability.state === "partial" ? "partial" : "unavailable"}
      title={capability.state === "partial" ? partialTitle : unavailableTitle}
      body={body}
      hint={hint}
    />
  );
}
