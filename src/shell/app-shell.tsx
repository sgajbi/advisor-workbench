"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import AppSwitcherNav from "./app-switcher-nav";
import { resolveShellApp } from "./app-registry";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentApp = resolveShellApp(pathname);

  return (
    <div className="shell-frame">
      <header className="shell-topbar">
        <div className="shell-topbar-main">
          <div className="shell-brand-block">
            <Link href="/" className="shell-brand">
              Lotus Workbench
            </Link>
            <div className="shell-current-app">
              <span className="shell-context-label">Current Workspace</span>
              <strong className="shell-context-title">{currentApp.label}</strong>
              <span className="shell-context-description">{currentApp.description}</span>
            </div>
          </div>
          <AppSwitcherNav />
        </div>
      </header>
      <div className="shell-body">{children}</div>
    </div>
  );
}
