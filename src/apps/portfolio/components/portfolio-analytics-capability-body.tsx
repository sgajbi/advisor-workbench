"use client";

import type { ReactNode } from "react";

import { WorkbenchLoadingState, WorkspaceCapabilityPanel } from "@/design-system";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";
import { isSupportedCapability } from "@/shell/workspace-capabilities";

export default function PortfolioAnalyticsCapabilityBody<T>({
  capability,
  detailsLoading,
  supportedData,
  partialTitle,
  unavailableTitle,
  body,
  partialHint,
  unavailableHint,
  children,
}: {
  capability: WorkspaceCapability;
  detailsLoading: boolean;
  supportedData: T | null | undefined;
  partialTitle: string;
  unavailableTitle: string;
  body: string;
  partialHint: string;
  unavailableHint: string;
  children: (data: NonNullable<T>) => ReactNode;
}) {
  if (detailsLoading) {
    return (
      <WorkbenchLoadingState
        title="Loading analytics"
        message="Analytical detail is loading for the selected portfolio context."
        chart
        rows={4}
      />
    );
  }

  if (isSupportedCapability(capability) && supportedData) {
    return <>{children(supportedData as NonNullable<T>)}</>;
  }

  return (
    <WorkspaceCapabilityPanel
      capability={capability}
      partialTitle={partialTitle}
      unavailableTitle={unavailableTitle}
      body={body}
      hint={capability.state === "partial" ? partialHint : unavailableHint}
    />
  );
}
