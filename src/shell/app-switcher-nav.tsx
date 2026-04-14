"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { WorkspaceTabNav } from "@/design-system";
import { fallbackNormalizedCapabilities } from "@/features/platform-capabilities/api";
import { usePlatformCapabilities } from "@/features/platform-capabilities/use-platform-capabilities";
import type { PlatformShellWorkspaceDescriptor } from "@/features/platform-capabilities/types";

import { resolveShellApp } from "./app-registry";
import { getWorkspaceDisabledTitle } from "./workspace-supportability-copy";

export default function AppSwitcherNav() {
  const { loading, normalized, shellBootstrapSource } = usePlatformCapabilities();
  const fallback = fallbackNormalizedCapabilities();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeApp = resolveShellApp(pathname, searchParams);
  const workspaceDescriptors =
    shellBootstrapSource === "contract"
      ? normalized.shellBootstrap.workspaces
      : shellBootstrapSource === "fallback"
        ? fallback.shellBootstrap.workspaces
        : [];

  if (loading && shellBootstrapSource === "loading") {
    return <div className="shell-workspace-tabs-skeleton" aria-hidden="true" />;
  }

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

  return getWorkspaceDisabledTitle(workspace);
}
