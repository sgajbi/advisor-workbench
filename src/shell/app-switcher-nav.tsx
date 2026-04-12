"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { WorkspaceTabNav } from "@/design-system";
import { fallbackNormalizedCapabilities } from "@/features/platform-capabilities/api";

import { SHELL_APPS, type ShellApp } from "./app-registry";

function isAppEnabled(app: ShellApp, navigation: Record<string, boolean | undefined>): boolean {
  if (!app.available) {
    return false;
  }
  if (!app.capabilityKey) {
    return true;
  }
  return navigation[app.capabilityKey] !== false;
}

export default function AppSwitcherNav() {
  const navigation = fallbackNormalizedCapabilities().navigation;
  const visibleApps = SHELL_APPS.filter((app) => app.visible !== false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const items = visibleApps.map((app) => {
    const enabled = isAppEnabled(app, navigation);
    const isRiskRoute = pathname === "/performance" && searchParams.get("mode") === "risk";
    const isActive =
      app.id === "risk"
        ? isRiskRoute
        : app.id === "performance"
          ? pathname === "/performance" && !isRiskRoute
          : pathname === app.href || pathname?.startsWith(`${app.href}/`);

    return {
      key: app.id,
      label: app.label,
      href: enabled ? app.href : undefined,
      disabled: !enabled,
      active: isActive,
      title: app.description,
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
