import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import ProposalSimulatePage from "../../src/app/proposals/simulate/page";

const redirectMock = vi.fn((target: string) => {
  throw new Error(`REDIRECT:${target}`);
});

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

vi.mock("../../src/features/proposals/components/proposal-simulate-form", () => ({
  default: ({ initialPortfolioId }: { initialPortfolioId?: string }) => (
    <section>
      <h1>Create Advisory Proposal</h1>
      <p>{initialPortfolioId}</p>
    </section>
  ),
}));

vi.mock("../../src/features/proposals/components/proposal-workspace-shell", () => ({
  default: ({
    title,
    portfolioId,
    workflowContext,
    children,
  }: {
    title: string;
    portfolioId: string;
    workflowContext?: { title: string; sourceLabel: string };
    children: React.ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      <p>{portfolioId}</p>
      {workflowContext ? (
        <aside>
          <h2>{workflowContext.title}</h2>
          <p>{workflowContext.sourceLabel}</p>
        </aside>
      ) : null}
      {children}
    </section>
  ),
  resolveProposalPortfolioId: (portfolioId?: string | null) =>
    portfolioId?.trim() || "PB_SG_GLOBAL_BAL_001",
}));

describe("ProposalSimulatePage", () => {
  afterEach(() => {
    redirectMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("renders proposal simulation with the selected portfolio", async () => {
    render(
      await ProposalSimulatePage({
        searchParams: Promise.resolve({ portfolioId: "PORT_UI_1001" }),
      })
    );

    expect(screen.getByRole("heading", { name: "Create Advisory Proposal" })).toBeInTheDocument();
    expect(screen.getAllByText("PORT_UI_1001").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Draft not yet persisted" })).toBeInTheDocument();
    expect(screen.getByText("No persisted advisory workflow record")).toBeInTheDocument();
  });

  it("defaults proposal simulation to the canonical front-office portfolio", async () => {
    render(
      await ProposalSimulatePage({
        searchParams: Promise.resolve({}),
      })
    );

    expect(screen.getAllByText("PB_SG_GLOBAL_BAL_001").length).toBeGreaterThan(0);
  });
});

