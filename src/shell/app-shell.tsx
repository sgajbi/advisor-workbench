"use client";

import Link from "next/link";

import AppSwitcherNav from "./app-switcher-nav";
import LotusMark from "./lotus-mark";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell-frame">
      <header className="shell-topbar">
        <div className="shell-topbar-main">
          <div className="shell-brand-block">
            <Link href="/" className="shell-brand">
              <span className="shell-brand-emblem">
                <LotusMark />
              </span>
              <span className="shell-brand-text">Lotus</span>
            </Link>
          </div>
          <AppSwitcherNav />
        </div>
      </header>
      <div className="shell-body">{children}</div>
    </div>
  );
}
