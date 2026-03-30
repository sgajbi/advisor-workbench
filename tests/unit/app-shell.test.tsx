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
}));

vi.mock("@/features/platform-capabilities/api", () => ({
  fallbackNormalizedCapabilities: () => ({
    navigation: {
      command_center: true,
      analytics_studio: true,
      advisory_pipeline: true,
      reporting_hub: false,
      decision_console: true,
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
    expect(screen.getByRole("navigation", { name: "Application Switcher" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute("href", "/portfolio");
    expect(screen.getByRole("link", { name: "Performance" })).toHaveAttribute("href", "/performance");
    expect(screen.queryByText("Recommendations")).not.toBeInTheDocument();
    expect(screen.getByText("Relationship Book")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Portfolio workspace body")).toBeInTheDocument();
  });
});

describe("LotusMark", () => {
  it("renders an accessible brand mark", () => {
    render(<LotusMark />);

    expect(screen.getByRole("img", { name: "Lotus" })).toBeInTheDocument();
  });
});
