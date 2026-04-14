"use client";

import { Suspense } from "react";
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
          <div className="shell-utility-bar" aria-label="Client search and banker context">
            <label className="shell-utility-search" aria-label="Global search">
              <span className="shell-utility-search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                className="shell-utility-search-input"
                type="search"
                placeholder="Search clients, accounts, proposals..."
                aria-label="Search clients, accounts, proposals"
              />
            </label>
            <button
              type="button"
              className="shell-utility-notification"
              aria-label="Notifications"
              title="Notifications"
            >
              <BellIcon />
              <span className="shell-utility-notification-dot" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="shell-user-chip"
              aria-label="Jordan Davis, Private Banker"
              title="Jordan Davis, Private Banker"
            >
              <span className="shell-user-avatar" aria-hidden="true">
                JD
              </span>
              <span className="shell-user-copy">
                <span className="shell-user-name">Jordan Davis</span>
                <span className="shell-user-role">Private Banker</span>
              </span>
              <span className="shell-user-chevron" aria-hidden="true">
                <ChevronDownIcon />
              </span>
            </button>
          </div>
        </div>
        <div className="shell-workspace-bar">
          <Suspense fallback={null}>
            <AppSwitcherNav />
          </Suspense>
        </div>
      </header>
      <div className="shell-body">{children}</div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M14.25 14.25L18 18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8.75" cy="8.75" r="5.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 3.25C7.93 3.25 6.25 4.93 6.25 7V8.82C6.25 9.41 6.08 9.98 5.77 10.48L4.91 11.87C4.13 13.13 5.03 14.75 6.5 14.75H13.5C14.97 14.75 15.87 13.13 15.09 11.87L14.23 10.48C13.92 9.98 13.75 9.41 13.75 8.82V7C13.75 4.93 12.07 3.25 10 3.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 16.25C8.83 16.83 9.37 17.17 10 17.17C10.63 17.17 11.17 16.83 11.5 16.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6 8L10 12L14 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
