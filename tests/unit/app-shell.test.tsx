import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AppShell, { AdvisorBookLinkLoading } from "@/shell/app-shell";
import { buildAdvisorBookHref } from "@/shell/advisor-book-link";
import LotusMark from "@/shell/lotus-mark";

vi.mock("next/link", () => ({
  default: ({ href, className, children, "aria-label": ariaLabel }: { href: string; className?: string; children: React.ReactNode; "aria-label"?: string }) => (
    <a href={href} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/portfolio",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/platform-capabilities/use-platform-capabilities", () => ({
  usePlatformCapabilities: () => ({
    loading: false,
    partialFailure: false,
    errors: [],
    shellBootstrapSource: "contract",
    normalized: {
      shellBootstrap: {
        workspaces: [
          { id: "portfolio", label: "Portfolio", href: "/portfolio", enabled: true, supportability: { state: "ready", reasons: [] } },
          { id: "performance", label: "Performance", href: "/performance", enabled: true, supportability: { state: "ready", reasons: [] } },
          { id: "risk", label: "Risk", href: "/performance?mode=risk", enabled: true, supportability: { state: "ready", reasons: [] } },
          { id: "proposal", label: "Proposal", href: "/proposals", enabled: false, supportability: { state: "unavailable", reasons: ["proposal_disabled"] } },
          { id: "advisory", label: "Advisory", href: "/recommendations", enabled: false, supportability: { state: "unavailable", reasons: ["advisory_disabled"] } },
        ],
      },
    },
  }),
}));

describe("AppShell", () => {
  it("renders the Lotus brand, application navigation, and children", () => {
    render(
      <AppShell>
        <div>Portfolio workspace body</div>
      </AppShell>
    );

    expect(screen.getByRole("link", { name: /Lotus/i })).toHaveAttribute("href", "/");
    expect(screen.getByText("Private Banking Workbench")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Advisor My book/i })).toHaveAttribute("href", "/book");
    expect(screen.getByRole("navigation", { name: "Workspace Navigation" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Switch workspace/i }));
    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute("href", "/portfolio");
    expect(screen.getByRole("link", { name: "Performance" })).toHaveAttribute("href", "/performance");
    expect(screen.getByRole("link", { name: "Risk" })).toHaveAttribute("href", "/performance?mode=risk");
    expect(screen.getByText("Proposal")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Advisory")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notifications" })).not.toBeInTheDocument();
    expect(screen.queryByText("Jordan Davis")).not.toBeInTheDocument();
    expect(screen.queryByText("Private Banker")).not.toBeInTheDocument();
    expect(screen.getByText("Portfolio workspace body")).toBeInTheDocument();
  });

  it("keeps My book non-actionable until its date-preserving link is ready", () => {
    render(<AdvisorBookLinkLoading />);

    expect(
      screen.getByRole("status", { name: "Preparing My book navigation" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("link", { name: /My book/i })).not.toBeInTheDocument();
  });
});

describe("buildAdvisorBookHref", () => {
  it("preserves the active review date when returning to the advisor book", () => {
    expect(buildAdvisorBookHref(new URLSearchParams("asOfDate=2026-04-22&mode=summary"))).toBe(
      "/book?asOfDate=2026-04-22",
    );
  });

  it("uses the advisor book default date when no review date is active", () => {
    expect(buildAdvisorBookHref(new URLSearchParams("mode=summary"))).toBe("/book");
  });

});

describe("LotusMark", () => {
  it("renders an accessible brand mark", () => {
    render(<LotusMark />);

    expect(screen.getByRole("img", { name: "Lotus" })).toBeInTheDocument();
  });
});
