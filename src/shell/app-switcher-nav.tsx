"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <nav className="shell-nav" aria-label="Application Switcher">
      {visibleApps.map((app) => {
        const enabled = isAppEnabled(app, navigation);
        const isActive = pathname === app.href || pathname?.startsWith(`${app.href}/`);
        if (!enabled) {
          return (
            <span
              key={app.id}
              className="shell-nav-link shell-nav-link-disabled"
              aria-disabled="true"
              title={app.description}
            >
              {app.label}
            </span>
          );
        }

        return (
          <Link
            key={app.id}
            href={app.href}
            className={`shell-nav-link${isActive ? " shell-nav-link-active" : ""}`}
            title={app.description}
            aria-current={isActive ? "page" : undefined}
          >
            {app.label}
          </Link>
        );
      })}
    </nav>
  );
}
