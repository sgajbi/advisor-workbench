"use client";

import Link from "next/link";

import { usePlatformCapabilities } from "@/features/platform-capabilities/use-platform-capabilities";

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
  const { normalized } = usePlatformCapabilities();
  const navigation = normalized.navigation;

  return (
    <nav className="shell-nav" aria-label="Application Switcher">
      {SHELL_APPS.map((app) => {
        const enabled = isAppEnabled(app, navigation);
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
            className="shell-nav-link"
            title={app.description}
          >
            {app.label}
          </Link>
        );
      })}
    </nav>
  );
}
