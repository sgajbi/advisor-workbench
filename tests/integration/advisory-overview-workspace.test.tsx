import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdvisoryOverviewWorkspace from "../../src/features/proposals/components/advisory-overview-workspace";

const defaultProposalList = {
  items: [
    {
      proposal_id: "PRP-RISK",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      current_state: "RISK_REVIEW",
      title: "Technology concentration trim",
    },
    {
      proposal_id: "PRP-READY",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      current_state: "EXECUTION_READY",
      title: "Implementation handoff",
    },
  ],
  next_cursor: null as string | null,
};

const listProposalsMock = vi.fn(
  async (_filters?: unknown) => defaultProposalList,
);

vi.mock("../../src/features/proposals/api", () => ({
  listProposals: (filters: unknown) => listProposalsMock(filters),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return {
    queryClient,
    view: render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    ),
  };
}

async function expectAdviserPrioritiesHeading() {
  expect(
    await screen.findByRole("heading", {
      level: 2,
      name: "Adviser priorities",
    }),
  ).toBeInTheDocument();
}

describe("AdvisoryOverviewWorkspace", () => {
  beforeEach(() => {
    listProposalsMock.mockReset();
    listProposalsMock.mockResolvedValue(defaultProposalList);
  });

  it("renders portfolio-scoped advisory posture and priority actions", async () => {
    renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    await waitFor(() => {
      expect(listProposalsMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        cursor: undefined,
        limit: 8,
      });
    });

    await expectAdviserPrioritiesHeading();
    expect(
      screen.getByText(
        "Resolve review blockers before preparing any client discussion material.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Advisory journey screens"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open proposal review" }),
    ).toHaveAttribute(
      "href",
      "/proposals/PRP-RISK?portfolioId=PB_SG_GLOBAL_BAL_001&fromMode=overview",
    );
    expect(
      screen.getByRole("listbox", {
        name: "Advisory proposal decision worklist",
      }),
    ).toHaveAttribute("aria-orientation", "vertical");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getAllByRole("option")[0]).toHaveAttribute(
      "data-source-identity",
      "PRP-RISK",
    );
    expect(screen.getAllByRole("option")[0]).toHaveAttribute(
      "data-source-state",
      "RISK_REVIEW",
    );
    expect(screen.getAllByRole("option")[1]).toHaveAttribute(
      "data-source-identity",
      "PRP-READY",
    );
    expect(screen.getAllByRole("option")[1]).toHaveAttribute(
      "data-source-state",
      "EXECUTION_READY",
    );
    expect(
      screen.getByText("Technology concentration trim"),
    ).toBeInTheDocument();
    expect(screen.getByText("Risk review required")).toBeInTheDocument();
    expect(
      screen.getByText("Risk officer approval needed"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("2 items need action")).toHaveLength(1);
    expect(screen.queryByText("Build Proposal")).not.toBeInTheDocument();
    expect(screen.queryByText("Open Approval Queue")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Move recommendations from insight to implementation"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("advisory-source-window-posture"),
    ).toHaveTextContent("Complete source window");
  });

  it("moves from the selected proposal row into its source-backed decision", async () => {
    renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    const worklist = await screen.findByRole("listbox", {
      name: "Advisory proposal decision worklist",
    });
    const options = screen.getAllByRole("option");
    const decision = screen.getByRole("region", {
      name: "Selected advisory proposal",
    });

    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveAttribute("aria-controls", decision.id);
    options[0].focus();
    fireEvent.keyDown(options[0], { key: "ArrowDown" });

    expect(options[1]).toHaveFocus();
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(decision).toHaveTextContent("Ready for execution handoff");
    fireEvent.keyDown(options[1], { key: "Enter" });
    expect(decision).toHaveFocus();
    expect(worklist).toContainElement(options[1]);
  });

  it("retains the admitted fallback proposal when a source refresh reorders the worklist", async () => {
    const { queryClient } = renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveTextContent("Technology concentration trim");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
    });

    act(() => {
      queryClient.setQueriesData(
        {
          queryKey: ["advisory-overview", "PB_SG_GLOBAL_BAL_001"],
        },
        {
          ...defaultProposalList,
          items: defaultProposalList.items.map((proposal) => ({
            ...proposal,
            current_state:
              proposal.proposal_id === "PRP-RISK"
                ? "EXECUTION_READY"
                : "RISK_REVIEW",
          })),
        },
      );
    });

    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveTextContent("Implementation handoff");
      expect(options[0]).toHaveAttribute("aria-selected", "false");
      expect(options[1]).toHaveTextContent("Technology concentration trim");
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });
    expect(
      screen.getByRole("link", { name: "Open proposal review" }),
    ).toHaveAttribute(
      "href",
      "/proposals/PRP-RISK?portfolioId=PB_SG_GLOBAL_BAL_001&fromMode=overview",
    );
  });

  it("retains a requested proposal while Gateway resolves its source identity", async () => {
    let resolveProposals!: (value: typeof defaultProposalList) => void;
    const pendingProposals = new Promise<typeof defaultProposalList>(
      (resolve) => {
        resolveProposals = resolve;
      },
    );
    listProposalsMock.mockImplementationOnce(
      async () => await pendingProposals,
    );

    renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          selectedRecordId: "PRP-READY",
        }}
      />,
    );

    expect(
      screen.queryByRole("listbox", {
        name: "Advisory proposal decision worklist",
      }),
    ).not.toBeInTheDocument();
    await expectAdviserPrioritiesHeading();

    await act(async () => resolveProposals(defaultProposalList));

    const options = await screen.findAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveTextContent("Implementation handoff");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("link", { name: "Open proposal review" }),
    ).toHaveAttribute(
      "href",
      "/proposals/PRP-READY?portfolioId=PB_SG_GLOBAL_BAL_001&fromMode=overview",
    );
  });

  it("starts from the first source window when the selected portfolio changes", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [],
      next_cursor: "portfolio-a-window-2",
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const view = render(
      <QueryClientProvider client={queryClient}>
        <AdvisoryOverviewWorkspace
          reviewContext={{ portfolioId: "portfolio-a" }}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Next proposals" }),
    );
    await waitFor(() => {
      expect(listProposalsMock).toHaveBeenCalledWith({
        portfolioId: "portfolio-a",
        cursor: "portfolio-a-window-2",
        limit: 8,
      });
    });

    listProposalsMock.mockClear();
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <AdvisoryOverviewWorkspace
          reviewContext={{ portfolioId: "portfolio-b" }}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(listProposalsMock).toHaveBeenCalledWith({
        portfolioId: "portfolio-b",
        cursor: undefined,
        limit: 8,
      });
    });
  });

  it("does not show fallback proposals when the advisory queue fails", async () => {
    listProposalsMock.mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    expect(
      await screen.findByText("Advisory priorities are unavailable"),
    ).toBeInTheDocument();
    await expectAdviserPrioritiesHeading();
    expect(
      screen.getByText(
        /No substitute proposal, review, or implementation status is shown/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry advisory priorities" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Technology concentration trim"),
    ).not.toBeInTheDocument();
  });

  it("allows the newly selected portfolio to recover while an obsolete retry is pending", async () => {
    let resolvePortfolioARetry!: (value: typeof defaultProposalList) => void;
    const portfolioARetry = new Promise<typeof defaultProposalList>(
      (resolve) => {
        resolvePortfolioARetry = resolve;
      },
    );
    listProposalsMock.mockImplementation(async (filters?: unknown) => {
      const portfolioId = (filters as { portfolioId?: string } | undefined)
        ?.portfolioId;
      const portfolioCalls = listProposalsMock.mock.calls.filter(
        ([callFilters]) =>
          (callFilters as { portfolioId?: string } | undefined)?.portfolioId ===
          portfolioId,
      ).length;
      if (portfolioId === "portfolio-a") {
        if (portfolioCalls === 1) throw new Error("portfolio A unavailable");
        return await portfolioARetry;
      }
      if (portfolioId === "portfolio-b") {
        if (portfolioCalls === 1) throw new Error("portfolio B unavailable");
        return {
          items: [
            {
              proposal_id: "PRP-PORTFOLIO-B",
              portfolio_id: "portfolio-b",
              current_state: "DRAFT",
              title: "Portfolio B liquidity review",
            },
          ],
          next_cursor: null,
        };
      }
      return defaultProposalList;
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const view = render(
      <QueryClientProvider client={queryClient}>
        <AdvisoryOverviewWorkspace
          reviewContext={{ portfolioId: "portfolio-a" }}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Retry advisory priorities" }),
    );
    expect(listProposalsMock).toHaveBeenCalledTimes(2);

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <AdvisoryOverviewWorkspace
          reviewContext={{ portfolioId: "portfolio-b" }}
        />
      </QueryClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Retry advisory priorities" }),
    );

    expect(
      await screen.findByText("Portfolio B liquidity review"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Proposal priorities were updated."),
    ).toBeInTheDocument();
    expect(listProposalsMock).toHaveBeenCalledTimes(4);

    resolvePortfolioARetry(defaultProposalList);
    await waitFor(() => {
      expect(
        screen.getByText("Portfolio B liquidity review"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Proposal priorities were updated.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("recovers the initial worklist from Gateway without losing focus or duplicating requests", async () => {
    let resolveRetry!: (value: typeof defaultProposalList) => void;
    const pendingRetry = new Promise<typeof defaultProposalList>((resolve) => {
      resolveRetry = resolve;
    });
    listProposalsMock
      .mockRejectedValueOnce(new Error("gateway unavailable"))
      .mockImplementationOnce(async () => await pendingRetry);

    renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    const retry = await screen.findByRole("button", {
      name: "Retry advisory priorities",
    });
    retry.focus();
    fireEvent.click(retry);

    const pending = await screen.findByRole("button", {
      name: "Checking advisory priorities",
    });
    expect(pending).toHaveAttribute("aria-disabled", "true");
    expect(pending).not.toBeDisabled();
    expect(pending).toHaveFocus();
    fireEvent.click(pending);
    expect(listProposalsMock).toHaveBeenCalledTimes(2);

    resolveRetry(defaultProposalList);

    expect(
      await screen.findByText(
        "Proposal priorities were updated.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh advisory priorities" }),
    ).toHaveFocus();
    expect(
      screen.getByText("Technology concentration trim"),
    ).toBeInTheDocument();
    expect(listProposalsMock).toHaveBeenCalledTimes(2);
  });

  it("keeps a failed retry explicit and recoverable", async () => {
    listProposalsMock
      .mockRejectedValueOnce(new Error("gateway unavailable"))
      .mockRejectedValueOnce(new Error("gateway still unavailable"));

    renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    const retry = await screen.findByRole("button", {
      name: "Retry advisory priorities",
    });
    retry.focus();
    fireEvent.click(retry);

    expect(
      await screen.findByText("Advisory priorities remain unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry advisory priorities" }),
    ).toHaveFocus();
    expect(
      screen.queryByText(/gateway still unavailable/i),
    ).not.toBeInTheDocument();
  });

  it("retains earlier proposals until a failed refresh is source-confirmed", async () => {
    listProposalsMock
      .mockResolvedValueOnce(defaultProposalList)
      .mockRejectedValueOnce(new Error("refresh unavailable"))
      .mockResolvedValueOnce({
        items: [
          {
            proposal_id: "PRP-RECOVERED",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            current_state: "DRAFT",
            title: "Recovered income mandate review",
          },
        ],
        next_cursor: null,
      });

    renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    const refresh = await screen.findByRole("button", {
      name: "Refresh advisory priorities",
    });
    refresh.focus();
    fireEvent.click(refresh);

    expect(
      await screen.findByText("Proposal priorities could not be updated"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Technology concentration trim"),
    ).toBeInTheDocument();
    const retry = screen.getByRole("button", {
      name: "Retry advisory priorities",
    });
    expect(retry).toHaveFocus();
    fireEvent.click(retry);

    expect(
      await screen.findByText("Recovered income mandate review"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Technology concentration trim"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Proposal priorities were updated."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh advisory priorities" }),
    ).toHaveFocus();
  });

  it("removes an earlier confirmation when a newer background refresh fails", async () => {
    listProposalsMock
      .mockResolvedValueOnce(defaultProposalList)
      .mockResolvedValueOnce(defaultProposalList)
      .mockRejectedValueOnce(new Error("newer refresh unavailable"));

    const { queryClient } = renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Refresh advisory priorities",
      }),
    );
    expect(
      await screen.findByText(
        "Proposal priorities were updated.",
      ),
    ).toBeInTheDocument();

    await queryClient.refetchQueries({
      queryKey: ["advisory-overview", "PB_SG_GLOBAL_BAL_001", undefined],
      exact: true,
    });

    expect(
      await screen.findByText("Proposal priorities could not be updated"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Proposal priorities were updated.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Technology concentration trim"),
    ).toBeInTheDocument();
  });

  it("reconciles a failed manual outcome when a newer background refresh succeeds", async () => {
    listProposalsMock
      .mockResolvedValueOnce(defaultProposalList)
      .mockRejectedValueOnce(new Error("manual refresh unavailable"))
      .mockResolvedValueOnce({
        items: [
          {
            proposal_id: "PRP-AUTO-RECOVERED",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            current_state: "DRAFT",
            title: "Automatically recovered client review",
          },
        ],
        next_cursor: null,
      });

    const { queryClient } = renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Refresh advisory priorities",
      }),
    );
    expect(
      await screen.findByText("Proposal priorities could not be updated"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry advisory priorities" }),
    ).toBeInTheDocument();

    await queryClient.refetchQueries({
      queryKey: ["advisory-overview", "PB_SG_GLOBAL_BAL_001", undefined],
      exact: true,
    });

    expect(
      await screen.findByText("Automatically recovered client review"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Proposal priorities were updated."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh advisory priorities" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Proposal priorities could not be updated"),
    ).not.toBeInTheDocument();
  });

  it("discloses a partial proposal window instead of overstating portfolio totals", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        {
          proposal_id: "PRP-PARTIAL",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "DRAFT",
          title: "Income allocation review",
        },
      ],
      next_cursor: "cursor-2",
    });

    renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    expect(
      await screen.findByText("Income allocation review"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("advisory-source-window-posture"),
    ).toHaveTextContent(/Proposal window 1.*Counts and ranking apply only/);
    expect(
      screen.getByTestId("advisory-source-window-posture"),
    ).toHaveTextContent(/Proposal window 1.*Review adjacent windows/);
    expect(
      screen.getByRole("button", { name: "Next proposals" }),
    ).toBeEnabled();
  });

  it("keeps the decision and proposal worklist as the only primary workflow path", async () => {
    renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    const decision = await screen.findByTestId("advisory-decision-brief");
    const worklist = screen.getByTestId("advisory-priority-worklist");
    expect(decision.nextElementSibling).toBe(worklist);
    expect(worklist.nextElementSibling).toBeNull();
    expect(
      screen.queryByLabelText("Advisory overview summary"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("advisory-lifecycle-summary"),
    ).not.toBeInTheDocument();
  });

  it("keeps restricted proposal posture behind the source entitlement boundary", async () => {
    listProposalsMock.mockRejectedValueOnce(
      new Error("Proposal list failed (403): forbidden"),
    );

    renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    expect(
      await screen.findByText("Advisory proposal access is not available"),
    ).toBeInTheDocument();
    await expectAdviserPrioritiesHeading();
    expect(
      screen.queryByTestId("advisory-priority-worklist"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /advisory priorities/i }),
    ).not.toBeInTheDocument();
  });

  it("lets the advisor return after a later proposal window fails", async () => {
    listProposalsMock
      .mockResolvedValueOnce({
        items: [],
        next_cursor: "cursor-2",
      })
      .mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(
      <AdvisoryOverviewWorkspace
        reviewContext={{ portfolioId: "PB_SG_GLOBAL_BAL_001" }}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Next proposals" }),
    );
    expect(
      await screen.findByText("This proposal window is unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry proposal window" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Return to previous proposals" }),
    );
    expect(
      await screen.findByText("No proposals in this source window"),
    ).toBeInTheDocument();
    expect(screen.getByText("Proposal view 1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next proposals" }),
    ).toBeEnabled();
  });
});
