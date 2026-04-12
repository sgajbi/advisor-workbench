import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AppShell from "@/shell/app-shell";
import LotusMark from "@/shell/lotus-mark";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/portfolio",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/platform-capabilities/api", () => ({
  fallbackNormalizedCapabilities: () => ({
    navigation: {
      portfolio_workspace: true,
      performance_workspace: true,
      risk_workspace: true,
      proposal_workspace: false,
      advisory_workspace: false,
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
    expect(screen.getByRole("navigation", { name: "Workspace Navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute("href", "/portfolio");
    expect(screen.getByRole("link", { name: "Performance" })).toHaveAttribute("href", "/performance");
    expect(screen.getByRole("link", { name: "Risk" })).toHaveAttribute("href", "/performance?mode=risk");
    expect(screen.getByText("Proposal")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Advisory")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Portfolio workspace body")).toBeInTheDocument();
  });
});

describe("LotusMark", () => {
  it("renders an accessible brand mark", () => {
    render(<LotusMark />);

    expect(screen.getByRole("img", { name: "Lotus" })).toBeInTheDocument();
  });
});
