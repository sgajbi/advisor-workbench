import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

import { ScreenStatePanel } from "@/design-system";

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
      <ScreenStatePanel
        kind="loading"
        title="Loading detail"
        body={loadingText}
        surface="analysis"
      />
    );
  }

  if (capability.state === "partial" && allowPartialContent) {
    return (
      <>
        <ScreenStatePanel
          kind="partial"
          title={partialTitle}
          body={body}
          hint={hint}
          surface="analysis"
        />
        {children}
      </>
    );
  }

  return (
    <ScreenStatePanel
      kind={capability.state === "partial" ? "partial" : "unavailable"}
      title={capability.state === "partial" ? partialTitle : unavailableTitle}
      body={body}
      hint={hint}
      surface="analysis"
    />
  );
}
