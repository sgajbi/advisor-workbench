import React from "react";
import { describe, expect, it, vi } from "vitest";

import HomeRoute from "@/app/page";
import PerformanceRoute from "@/app/performance/page";
import PortfolioRoute from "@/app/portfolio/page";
import ProposalsPage from "@/app/proposals/page";
import ProposalDetailPage from "@/app/proposals/[proposalId]/page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`);
  }),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("app route wrappers", () => {
  it("re-exports the home route that redirects into portfolio", () => {
    expect(() => HomeRoute()).toThrowError("REDIRECT:/portfolio");
  });

  it("exposes the app-owned portfolio and performance routes", () => {
    expect(typeof PortfolioRoute).toBe("function");
    expect(typeof PerformanceRoute).toBe("function");
  });

  it("exposes the proposal list route", async () => {
    await expect(ProposalsPage({ searchParams: Promise.resolve({}) })).resolves.toBeTruthy();
  });

  it("mounts the proposal detail route for gateway-backed advisory posture", async () => {
    const route = await ProposalDetailPage({
      params: Promise.resolve({ proposalId: "PR_1001" }),
      searchParams: Promise.resolve({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        fromMode: "risk-impact",
      }),
    });

    expect(route.props).toMatchObject({
      proposalId: "PR_1001",
      returnPortfolioId: "PB_SG_GLOBAL_BAL_001",
      returnMode: "risk-impact",
    });
  });

  it("falls back safely when proposal return context is repeated", async () => {
    const route = await ProposalDetailPage({
      params: Promise.resolve({ proposalId: "PR_1001" }),
      searchParams: Promise.resolve({
        portfolioId: ["PB_DUPLICATE", "PB_OTHER"],
        fromMode: ["risk-impact", "implementation"],
      }),
    });

    expect(route.props).toMatchObject({
      proposalId: "PR_1001",
      returnPortfolioId: undefined,
      returnMode: undefined,
    });
  });
});
