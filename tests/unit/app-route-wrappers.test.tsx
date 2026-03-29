import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomeRoute from "@/app/page";
import PerformanceRoute from "@/app/performance/page";
import PortfolioRoute from "@/app/portfolio/page";
import RecommendationsRoute from "@/app/recommendations/page";
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

vi.mock("@/features/proposals/components/proposal-list-view", () => ({
  default: () => <div>Proposal list view</div>,
}));

vi.mock("@/features/proposals/components/proposal-detail-view", () => ({
  default: ({ proposalId }: { proposalId: string }) => <div>Proposal detail {proposalId}</div>,
}));

describe("app route wrappers", () => {
  it("re-exports the home route that redirects into portfolio", () => {
    expect(() => HomeRoute()).toThrowError("REDIRECT:/portfolio");
  });

  it("exposes the app-owned portfolio, performance, and recommendations routes", () => {
    expect(typeof PortfolioRoute).toBe("function");
    expect(typeof PerformanceRoute).toBe("function");
    expect(typeof RecommendationsRoute).toBe("function");
  });

  it("renders the proposal list route shell", () => {
    render(<ProposalsPage />);

    expect(screen.getByRole("heading", { name: "Proposal Operations Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Proposal Draft" })).toHaveAttribute(
      "href",
      "/proposals/simulate"
    );
    expect(screen.getByText("Proposal list view")).toBeInTheDocument();
  });

  it("renders the proposal detail route shell with the requested proposal id", async () => {
    render(await ProposalDetailPage({ params: Promise.resolve({ proposalId: "PR_1001" }) }));

    expect(screen.getByRole("heading", { name: "Proposal Detail" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Proposal Workspace" })).toHaveAttribute(
      "href",
      "/proposals"
    );
    expect(screen.getByText("Proposal detail PR_1001")).toBeInTheDocument();
  });
});
