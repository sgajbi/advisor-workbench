import React from "react";
import { render } from "@testing-library/react";
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

  it("redirects the proposal detail route back to portfolio", async () => {
    await expect(
      ProposalDetailPage({ params: Promise.resolve({ proposalId: "PR_1001" }) })
    ).rejects.toThrowError("REDIRECT:/portfolio");
  });
});
