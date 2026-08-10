import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fallbackNormalizedCapabilities } from "../../src/features/platform-capabilities/api";
import AppSwitcherNav from "../../src/shell/app-switcher-nav";

const usePlatformCapabilitiesMock = vi.fn();
const usePathnameMock = vi.fn();
const useSearchParamsMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    href,
    className,
    children,
    title,
    "aria-current": ariaCurrent,
  }: {
    href: string;
    className?: string;
    children: React.ReactNode;
    title?: string;
    "aria-current"?: "page" | undefined;
  }) => (
    <a href={href} className={className} title={title} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/features/platform-capabilities/use-platform-capabilities", () => ({
  usePlatformCapabilities: () => usePlatformCapabilitiesMock(),
}));

describe("AppSwitcherNav", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/performance");
    useSearchParamsMock.mockReturnValue(new URLSearchParams("mode=risk"));
  });

  it("renders gateway-backed workspace descriptors with active and disabled states", () => {
    usePlatformCapabilitiesMock.mockReturnValue({
      loading: false,
      partialFailure: false,
      errors: [],
      shellBootstrapSource: "contract",
      normalized: {
        ...fallbackNormalizedCapabilities(),
        shellBootstrap: {
          workspaces: [
            {
              id: "portfolio",
              label: "Portfolio",
              href: "/portfolio",
              enabled: true,
              supportability: { state: "ready", reasons: [] },
            },
            {
              id: "performance",
              label: "Performance",
              href: "/performance",
              enabled: true,
              supportability: { state: "ready", reasons: [] },
            },
            {
              id: "risk",
              label: "Risk",
              href: "/performance?mode=risk",
              enabled: true,
              supportability: { state: "ready", reasons: [] },
            },
            {
              id: "proposal",
              label: "Proposal",
              href: "/proposals",
              enabled: false,
              supportability: {
                state: "degraded",
                reasons: ["dependency_degraded"],
              },
            },
          ],
        },
      },
    });

    render(<AppSwitcherNav />);

    expect(screen.getByRole("navigation", { name: "Workspace Navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Risk" })).toHaveAttribute(
      "href",
      "/performance?mode=risk"
    );
    expect(screen.getByRole("link", { name: "Risk" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Proposal")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Proposal")).toHaveAttribute(
      "title",
      "Proposal is temporarily unavailable because required information could not be retrieved."
    );
  });

  it("marks Portfolio as the only current workspace on Allocation", () => {
    usePathnameMock.mockReturnValue("/allocation");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    usePlatformCapabilitiesMock.mockReturnValue({
      loading: false,
      partialFailure: false,
      errors: [],
      shellBootstrapSource: "fallback",
      normalized: fallbackNormalizedCapabilities(),
    });

    render(<AppSwitcherNav />);

    const navigation = screen.getByRole("navigation", { name: "Workspace Navigation" });
    expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("keeps Data Products outside the advisor workspace set", () => {
    usePathnameMock.mockReturnValue("/data-products");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    usePlatformCapabilitiesMock.mockReturnValue({
      loading: false,
      partialFailure: false,
      errors: [],
      shellBootstrapSource: "fallback",
      normalized: fallbackNormalizedCapabilities(),
    });

    render(<AppSwitcherNav />);

    const navigation = screen.getByRole("navigation", { name: "Workspace Navigation" });
    expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
    expect(screen.queryByRole("link", { name: "Data Products" })).not.toBeInTheDocument();
  });

  it("keeps unknown source codes out of primary navigation copy", () => {
    usePlatformCapabilitiesMock.mockReturnValue({
      loading: false,
      partialFailure: false,
      errors: [],
      shellBootstrapSource: "contract",
      normalized: {
        ...fallbackNormalizedCapabilities(),
        shellBootstrap: {
          workspaces: [
            {
              id: "proposal",
              label: "Proposal",
              href: "/proposals",
              enabled: false,
              supportability: {
                state: "unavailable",
                reasons: ["NEW_SOURCE_REASON_42"],
              },
            },
          ],
        },
      },
    });

    render(<AppSwitcherNav />);

    expect(screen.getByText("Proposal")).toHaveAttribute(
      "title",
      "Proposal availability could not be confirmed."
    );
    expect(screen.getByText("Proposal")).not.toHaveAttribute(
      "title",
      expect.stringContaining("NEW_SOURCE_REASON_42")
    );
  });

  it("suppresses fallback-led workspace links while contract bootstrap is still loading", () => {
    usePlatformCapabilitiesMock.mockReturnValue({
      loading: true,
      partialFailure: false,
      errors: [],
      shellBootstrapSource: "loading",
      normalized: {
        ...fallbackNormalizedCapabilities(),
        shellBootstrap: {
          ...fallbackNormalizedCapabilities().shellBootstrap,
          workspaces: [],
        },
      },
    });

    const { container } = render(<AppSwitcherNav />);

    expect(screen.queryByRole("navigation", { name: "Workspace Navigation" })).not.toBeInTheDocument();
    expect(container.querySelector(".shell-workspace-tabs-skeleton")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Portfolio" })).not.toBeInTheDocument();
  });
});
