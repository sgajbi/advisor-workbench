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
    expect(screen.getByText("PORT_UI_1001")).toBeInTheDocument();
  });

  it("defaults proposal simulation to the canonical front-office portfolio", async () => {
    render(
      await ProposalSimulatePage({
        searchParams: Promise.resolve({}),
      })
    );

    expect(screen.getByText("PB_SG_GLOBAL_BAL_001")).toBeInTheDocument();
  });
});

