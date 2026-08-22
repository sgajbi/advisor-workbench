import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import ProposalSimulatePage from "../../src/app/proposals/simulate/page";

const proposalFormRenderMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/features/proposals/components/proposal-simulate-form", () => ({
  default: ({
    initialPortfolioId,
    initialAsOfDate,
  }: {
    initialPortfolioId?: string;
    initialAsOfDate?: string;
  }) => {
    proposalFormRenderMock({ initialPortfolioId, initialAsOfDate });
    return (
      <section>
        <h1>Create Advisory Proposal</h1>
        <p>{initialPortfolioId}</p>
        <p data-testid="initial-advisory-date">{initialAsOfDate || "Not confirmed"}</p>
      </section>
    );
  },
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
}));

describe("ProposalSimulatePage", () => {
  afterEach(() => {
    proposalFormRenderMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("renders proposal simulation with the selected portfolio", async () => {
    render(
      await ProposalSimulatePage({
        searchParams: Promise.resolve({
          portfolioId: "PORT_UI_1001",
          asOfDate: "2026-04-10",
        }),
      })
    );

    expect(screen.getByRole("heading", { name: "Create Advisory Proposal" })).toBeInTheDocument();
    expect(screen.getAllByText("PORT_UI_1001").length).toBeGreaterThan(0);
    expect(screen.getByTestId("initial-advisory-date")).toHaveTextContent("2026-04-10");
    expect(screen.getByRole("heading", { name: "Draft not yet persisted" })).toBeInTheDocument();
    expect(screen.getByText("No persisted advisory workflow record")).toBeInTheDocument();
  });

  it("requires a source-confirmed portfolio instead of substituting the demo book", async () => {
    render(
      await ProposalSimulatePage({
        searchParams: Promise.resolve({}),
      })
    );

    expect(screen.getByText("Review context needs attention")).toBeInTheDocument();
    expect(screen.getByText(/No demo portfolio was substituted/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Select a portfolio from My book" })).toHaveAttribute(
      "href",
      "/book",
    );
    expect(proposalFormRenderMock).not.toHaveBeenCalled();
  });

  it("fails closed when proposal context query parameters are repeated", async () => {
    render(
      await ProposalSimulatePage({
        searchParams: Promise.resolve({
          portfolioId: ["PORT_DUPLICATE", "PORT_OTHER"],
          asOfDate: ["2026-04-10", "2026-04-11"],
        }),
      })
    );

    expect(screen.getByText("Review context needs attention")).toBeInTheDocument();
    expect(screen.getByText(/repeated or unsupported review context/i)).toBeInTheDocument();
    expect(proposalFormRenderMock).not.toHaveBeenCalled();
  });
});

