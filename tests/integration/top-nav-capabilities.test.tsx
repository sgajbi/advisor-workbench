import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TopNav from "../../src/app/top-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/performance",
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

describe("TopNav", () => {
  it("disables routes based on normalized navigation capabilities", () => {
    render(<TopNav />);

    expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute("href", "/portfolio");
    expect(screen.getByRole("link", { name: "Performance" })).toHaveAttribute("href", "/performance");
    expect(screen.getByRole("link", { name: "Risk" })).toHaveAttribute("href", "/performance?mode=risk");
    expect(screen.getByText("Proposal")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Advisory")).toHaveAttribute("aria-disabled", "true");
  });
});
