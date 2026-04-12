"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { WorkspaceTabNav } from "@/design-system";
import { fallbackNormalizedCapabilities } from "@/features/platform-capabilities/api";
import { usePlatformCapabilities } from "@/features/platform-capabilities/use-platform-capabilities";
import type { PlatformShellWorkspaceDescriptor } from "@/features/platform-capabilities/types";

import { resolveShellApp } from "./app-registry";

export default function AppSwitcherNav() {
  const { normalized } = usePlatformCapabilities();
  const fallback = fallbackNormalizedCapabilities();
  const workspaceDescriptors =
    normalized.shellBootstrap?.workspaces?.length
      ? normalized.shellBootstrap.workspaces
      : fallback.shellBootstrap.workspaces;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeApp = resolveShellApp(pathname, searchParams);

  const items = workspaceDescriptors.map((workspace) => {
    return {
      key: workspace.id,
      label: workspace.label,
      href: workspace.enabled ? workspace.href : undefined,
      disabled: !workspace.enabled,
      active: activeApp.id === workspace.id,
      title: buildWorkspaceTitle(workspace),
    };
  });

  return (
    <WorkspaceTabNav
      items={items}
      ariaLabel="Workspace Navigation"
      className="shell-workspace-tabs"
    />
  );
}

function buildWorkspaceTitle(workspace: PlatformShellWorkspaceDescriptor): string {
  if (workspace.enabled) {
    return workspace.label;
  }

  const reason = workspace.supportability.reasons[0];
  return reason ? `${workspace.label} (${reason.replaceAll("_", " ")})` : workspace.label;
}
