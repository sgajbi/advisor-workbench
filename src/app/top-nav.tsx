"use client";

import Link from "next/link";

import { usePlatformCapabilities } from "@/features/platform-capabilities/use-platform-capabilities";

type NavEntry = {
  label: string;
  href: string;
  key: string;
};

const NAV_ENTRIES: NavEntry[] = [
  { label: "Portfolio Foundation", href: "/portfolios", key: "command_center" },
  { label: "Portfolio Intake", href: "/pas/intake", key: "portfolio_intake" },
  { label: "Analytics Studio", href: "/pa/analytics", key: "analytics_studio" },
  { label: "Advisory Pipeline", href: "/proposals", key: "advisory_pipeline" },
  { label: "Scenario Builder", href: "/proposals/simulate", key: "scenario_builder" },
  { label: "Decision Console", href: "/workbench", key: "decision_console" },
];

export default function TopNav() {
  const { normalized } = usePlatformCapabilities();

  return (
    <nav className="nav-links">
      {NAV_ENTRIES.map((entry) => {
        const enabled = normalized.navigation[entry.key] !== false;
        if (!enabled) {
          return (
            <span key={entry.href} className="nav-link nav-link-disabled" aria-disabled="true">
              {entry.label}
            </span>
          );
        }
        return (
          <Link key={entry.href} href={entry.href} className="nav-link">
            {entry.label}
          </Link>
        );
      })}
    </nav>
  );
}
