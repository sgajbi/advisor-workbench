"use client";

import { Suspense } from "react";
import Link from "next/link";

import AdvisorBookLink from "./advisor-book-link";
import AppSwitcherNav, { AppSwitcherNavLoading } from "./app-switcher-nav";
import styles from "./app-shell.module.css";
import LotusMark from "./lotus-mark";

export function AdvisorBookLinkLoading() {
  return (
    <div
      className={styles.bookLink}
      role="status"
      aria-label="Preparing My book navigation"
      aria-busy="true"
    >
      <small>Advisor</small>
      <strong>My book</strong>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell-frame">
      <header className="shell-topbar">
        <div className={`shell-topbar-main ${styles.topbarMain}`}>
          <div className="shell-brand-block">
            <Link href="/" className="shell-brand">
              <span className="shell-brand-emblem">
                <LotusMark />
              </span>
              <span className="shell-brand-text">Lotus</span>
            </Link>
            <span className={`shell-product-context ${styles.productContext}`}>
              Private Banking Workbench
            </span>
          </div>
          <div className={styles.topbarActions}>
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
