"use client";

import { Suspense } from "react";
import Link from "next/link";

import AdvisorBookLink from "./advisor-book-link";
import AppSwitcherNav, { AppSwitcherNavLoading } from "./app-switcher-nav";
import LotusMark from "./lotus-mark";

function AdvisorBookLinkLoading() {
  return (
    <Link href="/book" className="shell-book-link">
      <small>Advisor</small>
      <strong>My book</strong>
    </Link>
  );
}

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
            <span className="shell-product-context">Private Banking Workbench</span>
          </div>
          <div className="shell-topbar-actions">
            <Suspense fallback={<AdvisorBookLinkLoading />}>
              <AdvisorBookLink />
            </Suspense>
            <Suspense fallback={<AppSwitcherNavLoading />}>
              <AppSwitcherNav />
            </Suspense>
          </div>
        </div>
      </header>
      <div className="shell-body">{children}</div>
    </div>
  );
}
