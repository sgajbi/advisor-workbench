"use client";

import type { PlatformShellWorkspaceDescriptor } from "@/features/platform-capabilities/types";

export function getWorkspaceDisabledTitle(
  workspace: PlatformShellWorkspaceDescriptor
): string {
  switch (workspace.id) {
    case "proposal":
      return "Proposal workspace is not available in this release.";
    case "advisory":
      return "Advisory workspace is not available in this release.";
    default:
      return `${workspace.label} workspace is currently unavailable.`;
  }
}
