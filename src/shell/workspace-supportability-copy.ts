"use client";

import type { PlatformShellWorkspaceDescriptor } from "@/features/platform-capabilities/types";

export function getWorkspaceDisabledTitle(
  workspace: PlatformShellWorkspaceDescriptor
): string {
  const sourceReason = workspace.supportability.reasons[0];
  if (sourceReason) {
    return `${workspace.label} workspace is unavailable: ${formatSupportabilityReason(sourceReason)}.`;
  }

  switch (workspace.id) {
    case "proposal":
      return "Proposal workspace is unavailable.";
    case "advisory":
      return "Advisory workspace is unavailable.";
    default:
      return `${workspace.label} workspace is currently unavailable.`;
  }
}

function formatSupportabilityReason(reason: string): string {
  return reason.replaceAll("_", " ").toLowerCase();
}
