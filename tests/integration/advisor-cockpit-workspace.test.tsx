import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdvisorCockpitWorkspace from "../../src/features/proposals/components/advisor-cockpit-workspace";
import type {
  AdvisorCockpitActionPageData,
  AdvisorCockpitPreparationPacketPageData,
  AdvisorCockpitSnapshotData,
  AdvisorCockpitSupportabilityData,
} from "../../src/features/proposals/types";

const advisorAction: NonNullable<AdvisorCockpitActionPageData["items"]>[number] = {
  action_item_id: "aci_policy_review_001",
  action_item_version: 1,
  action_family: "POLICY_REVIEW_REQUIRED",
  status: "PENDING_REVIEW",
  priority: "HIGH",
  owner_role: "ADVISOR",
  title: "Policy review required",
  next_required_action: "Review policy evidence before client discussion.",
  reason_codes: ["POLICY_PENDING_REVIEW", "CLIENT_READY_BLOCKED"],
  evidence_refs: [
    { summary: "Policy evaluation requires compliance review." },
  ],
  source_readiness_gaps: [
    {
      message: "Policy review is pending before client-ready posture can change.",
    },
  ],
  unsupported_capabilities: ["CLIENT_READY_PUBLICATION"],
  acknowledgement_state: { acknowledged: false },
};
const actionPageFixture: AdvisorCockpitActionPageData = {
  total_count: 1,
  items: [advisorAction],
};
const snapshotFixture: AdvisorCockpitSnapshotData = {
  snapshot_id: "cockpit_snapshot_1",
  action_counts: {
    "status.PENDING_REVIEW": 1,
    "status.BLOCKED": 0,
    "priority.HIGH": 1,
  },
  supportability: {
    gateway_posture: "SUPPORTED_BY_LOTUS_GATEWAY_RFC0026",
    workbench_posture: "CANONICAL_WORKBENCH_PROOF_PASSED_RFC0026",
    data_product_posture: "ACTIVE_ADVISOR_COCKPIT_PRODUCTS_RFC0026",
    client_ready_publication: "BLOCKED",
  },
  unsupported_capabilities: [
    "CLIENT_READY_PUBLICATION",
    "EXTERNAL_CLIENT_COMMUNICATION",
  ],
};
const preparationPageFixture: AdvisorCockpitPreparationPacketPageData = {
  total_count: 1,
  items: [
    {
      packet_id: "prep_1",
      context_type: "PORTFOLIO",
      context_ref: "PB_SG_GLOBAL_BAL_001",
      status: "READY",
      evidence_refs: [{ summary: "Proposal and policy evidence available." }],
    },
  ],
};
const supportabilityFixture: AdvisorCockpitSupportabilityData = {
  posture: "ADVISE_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED",
  unsupported_capabilities: ["OMS_ORDER_LIFECYCLE"],
};
const listAdvisorCockpitActionsMock = vi.fn(
  async (_filters?: unknown): Promise<AdvisorCockpitActionPageData> => actionPageFixture,
);
const getAdvisorCockpitSnapshotMock = vi.fn(
  async (_filters?: unknown): Promise<AdvisorCockpitSnapshotData> => snapshotFixture,
);
const listAdvisorCockpitPreparationPacketsMock = vi.fn(
  async (_filters?: unknown): Promise<AdvisorCockpitPreparationPacketPageData> =>
    preparationPageFixture,
);
const getAdvisorCockpitSupportabilityMock = vi.fn(
  async (_filters?: unknown): Promise<AdvisorCockpitSupportabilityData> =>
    supportabilityFixture,
);
const acknowledgeAdvisorCockpitActionMock = vi.fn(
  async (_actionItemId: string, _payload: unknown, _options: unknown) => ({
    action_item: { action_item_id: "aci_policy_review_001" },
    acknowledgement: { acknowledged: true },
    replayed: false,
  }),
);

vi.mock("../../src/features/proposals/api", () => ({
  acknowledgeAdvisorCockpitAction: (
    actionItemId: string,
    payload: unknown,
    options: unknown,
  ) => acknowledgeAdvisorCockpitActionMock(actionItemId, payload, options),
  getAdvisorCockpitSnapshot: (filters: unknown) =>
    getAdvisorCockpitSnapshotMock(filters),
  getAdvisorCockpitSupportability: (filters: unknown) =>
    getAdvisorCockpitSupportabilityMock(filters),
  listAdvisorCockpitActions: (filters: unknown) =>
    listAdvisorCockpitActionsMock(filters),
  listAdvisorCockpitPreparationPackets: (filters: unknown) =>
    listAdvisorCockpitPreparationPacketsMock(filters),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("AdvisorCockpitWorkspace", () => {
  beforeEach(() => {
    listAdvisorCockpitActionsMock
      .mockReset()
      .mockResolvedValue(actionPageFixture);
    getAdvisorCockpitSnapshotMock
      .mockReset()
      .mockResolvedValue(snapshotFixture);
    listAdvisorCockpitPreparationPacketsMock
      .mockReset()
      .mockResolvedValue(preparationPageFixture);
    getAdvisorCockpitSupportabilityMock
      .mockReset()
      .mockResolvedValue(supportabilityFixture);
    acknowledgeAdvisorCockpitActionMock.mockReset().mockResolvedValue({
      action_item: { action_item_id: "aci_policy_review_001" },
      acknowledgement: { acknowledged: true },
      replayed: false,
    });
  });

  it("renders Gateway-backed cockpit actions and supportability without local fallback worklists", async () => {
    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    await waitFor(() => {
      expect(listAdvisorCockpitActionsMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        limit: 25,
      });
      expect(getAdvisorCockpitSnapshotMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        limit: 25,
      });
      expect(listAdvisorCockpitPreparationPacketsMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        limit: 25,
      });
      expect(getAdvisorCockpitSupportabilityMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
      });
    });

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Policy review required",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Advisor cockpit counts")).toHaveTextContent(
      /Actions in scope\s*1/,
    );
    const actionRecords = within(
      screen.getByTestId("advisor-cockpit-action-records"),
    );
    expect(
      actionRecords.getByText("Review policy evidence before client discussion."),
    ).toBeInTheDocument();
    expect(
      actionRecords.getByText("Policy evaluation requires compliance review."),
    ).toBeInTheDocument();
    expect(
      actionRecords.getByRole("listbox", {
        name: "Advisor action review worklist",
      }),
    ).toBeInTheDocument();
    expect(
      actionRecords.getByRole("region", {
        name: "Selected advisor action",
      }),
    ).toBeInTheDocument();
    const readiness = screen
      .getByRole("heading", { name: "Preparation Readiness" })
      .closest<HTMLElement>(".section-block")!;
    expect(within(readiness).getByText("Client publication")).toBeInTheDocument();
    expect(within(readiness).getAllByText("Available")).toHaveLength(4);
    expect(within(readiness).getByText("Blocked")).toBeInTheDocument();
    expect(
      within(readiness).getByText("Client publication unavailable"),
    ).toBeInTheDocument();
    expect(
      within(readiness).getByText("Client communication unavailable"),
    ).toBeInTheDocument();
    expect(
      within(readiness).getByText("Order workflow unavailable"),
    ).toBeInTheDocument();
    expect(within(readiness).queryByText(/OMS/i)).not.toBeInTheDocument();
    expect(within(readiness).queryByText(/RFC 0026/i)).not.toBeInTheDocument();
    const supportDetails = within(readiness).getByText("Support details").closest("details")!;
    expect(supportDetails).not.toHaveAttribute("open");
    fireEvent.click(within(supportDetails).getByText("Support details"));
    expect(
      within(supportDetails).getByText("SUPPORTED_BY_LOTUS_GATEWAY_RFC0026"),
    ).toBeVisible();
    expect(
      within(supportDetails).queryByText("CLIENT_READY_PUBLICATION"),
    ).not.toBeInTheDocument();
    expect(
      within(supportDetails).queryByText("EXTERNAL_CLIENT_COMMUNICATION"),
    ).not.toBeInTheDocument();
    expect(
      within(supportDetails).queryByText("OMS_ORDER_LIFECYCLE"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("PENDING_REVIEW")).not.toBeInTheDocument();
    expect(
      screen.queryByText("CLIENT_READY_PUBLICATION"),
    ).not.toBeInTheDocument();
  });

  it("keeps the source action usable when an optional proposal reference is malformed", async () => {
    listAdvisorCockpitActionsMock.mockResolvedValueOnce({
      total_count: 1,
      items: [
        {
          ...advisorAction,
          proposal_id: 42 as unknown as string,
        },
      ],
    });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    const actionRecords = within(
      await screen.findByTestId("advisor-cockpit-action-records"),
    );
    expect(
      actionRecords.getByRole("option", {
        name: /Policy review required/,
      }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      actionRecords.getByText("Policy evaluation requires compliance review."),
    ).toBeInTheDocument();
    expect(
      actionRecords.getByRole("button", { name: "Acknowledge review" }),
    ).toBeEnabled();
    expect(
      actionRecords.queryByRole("link", { name: /Open proposal/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps unknown readiness neutral and confines its source value to support details", async () => {
    getAdvisorCockpitSnapshotMock.mockResolvedValueOnce({
      snapshot_id: "cockpit_snapshot_unknown",
      action_counts: {
        "status.PENDING_REVIEW": 1,
        "status.BLOCKED": 0,
        "priority.HIGH": 1,
      },
      supportability: {
        gateway_posture: "NEW_GATEWAY_POSTURE",
        workbench_posture: null,
        data_product_posture: "READY",
        client_ready_publication: "PENDING",
      },
      unsupported_capabilities: ["NEW_CAPABILITY"],
    });
    getAdvisorCockpitSupportabilityMock.mockResolvedValueOnce({
      posture: "NEW_OVERALL_POSTURE",
      unsupported_capabilities: ["NEW_CAPABILITY"],
    });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    const readiness = (
      await screen.findByRole("heading", { name: "Preparation Readiness" })
    ).closest<HTMLElement>(".section-block")!;
    expect(within(readiness).getAllByText("Not reported")).toHaveLength(5);
    expect(
      within(readiness).getByText("Additional workflow capability unavailable"),
    ).toBeInTheDocument();
    expect(within(readiness).queryByText("NEW_GATEWAY_POSTURE")).not.toBeVisible();
    expect(within(readiness).queryByText("NEW_CAPABILITY")).not.toBeVisible();

    const supportDetails = within(readiness).getByText("Support details").closest("details")!;
    fireEvent.click(within(supportDetails).getByText("Support details"));
    expect(within(supportDetails).getByText("NEW_GATEWAY_POSTURE")).toBeVisible();
    expect(within(supportDetails).getByText("NEW_CAPABILITY")).toBeVisible();
  });

  it("records acknowledgements through Gateway without clearing source-owned blockers locally", async () => {
    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    const actionRecords = within(
      await screen.findByTestId("advisor-cockpit-action-records"),
    );
    fireEvent.click(
      actionRecords.getByRole("button", { name: "Acknowledge review" }),
    );

    await waitFor(() => {
      expect(acknowledgeAdvisorCockpitActionMock).toHaveBeenCalledWith(
        "aci_policy_review_001",
        {
          action_item_version: 1,
          acknowledgement_note: "Reviewed in the advisor cockpit.",
        },
        {
          filters: {
            portfolioId: "PB_SG_GLOBAL_BAL_001",
          },
          idempotencyKey: "ui-cockpit-ack-aci_policy_review_001-1",
        },
      );
    });

    expect(actionRecords.getByText(/Client-ready Blocked/)).toBeInTheDocument();
  });

  it("keeps the prior advisor view qualified until every acknowledgement refresh settles", async () => {
    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    const actionRecords = within(
      await screen.findByTestId("advisor-cockpit-action-records"),
    );
    const acknowledgeButton = actionRecords.getByRole("button", {
      name: "Acknowledge review",
    });
    const snapshotRefresh = createDeferred<AdvisorCockpitSnapshotData>();
    const actionRefresh = createDeferred<AdvisorCockpitActionPageData>();
    const preparationRefresh =
      createDeferred<AdvisorCockpitPreparationPacketPageData>();
    const supportabilityRefresh =
      createDeferred<AdvisorCockpitSupportabilityData>();
    getAdvisorCockpitSnapshotMock.mockImplementationOnce(
      async () => await snapshotRefresh.promise,
    );
    listAdvisorCockpitActionsMock.mockImplementationOnce(
      async () => await actionRefresh.promise,
    );
    listAdvisorCockpitPreparationPacketsMock.mockImplementationOnce(
      async () => await preparationRefresh.promise,
    );
    getAdvisorCockpitSupportabilityMock.mockImplementationOnce(
      async () => await supportabilityRefresh.promise,
    );

    fireEvent.click(acknowledgeButton);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Confirming advisor priorities",
      }),
    ).toBeInTheDocument();
    expect(
      actionRecords.getByText(
        "Review recorded; confirming current advisor evidence.",
      ),
    ).toBeInTheDocument();
    expect(
      actionRecords.getByText("Policy evaluation requires compliance review."),
    ).toBeInTheDocument();
    expect(
      actionRecords.getByRole("button", { name: "Confirming..." }),
    ).toHaveAttribute("aria-disabled", "true");

    await act(async () => {
      snapshotRefresh.resolve({
        ...snapshotFixture,
        snapshot_id: "cockpit_snapshot_2",
      });
    });
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Confirming advisor priorities",
      }),
    ).toBeInTheDocument();

    await act(async () => {
      preparationRefresh.resolve(preparationPageFixture);
    });
    expect(
      actionRecords.getByText(
        "Review recorded; confirming current advisor evidence.",
      ),
    ).toBeInTheDocument();

    await act(async () => {
      supportabilityRefresh.resolve(supportabilityFixture);
    });
    expect(
      actionRecords.getByText(
        "Review recorded; confirming current advisor evidence.",
      ),
    ).toBeInTheDocument();

    await act(async () => {
      actionRefresh.resolve({
        total_count: 1,
        items: [
          {
            ...advisorAction,
            action_item_version: 2,
            title: "Policy review recorded",
            acknowledgement_state: {
              acknowledged: true,
              acknowledged_by: "advisor_1",
            },
          },
        ],
      });
    });

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Policy review recorded",
      }),
    ).toBeInTheDocument();
    expect(
      actionRecords.queryByText(
        "Review recorded; confirming current advisor evidence.",
      ),
    ).not.toBeInTheDocument();
    expect(
      actionRecords.getByRole("button", { name: "Acknowledged" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(acknowledgeAdvisorCockpitActionMock).toHaveBeenCalledTimes(1);
  });

  it("keeps cached advisor evidence partial and blocks another action when confirmation fails", async () => {
    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    const actionRecords = within(
      await screen.findByTestId("advisor-cockpit-action-records"),
    );
    const acknowledgeButton = actionRecords.getByRole("button", {
      name: "Acknowledge review",
    });
    listAdvisorCockpitActionsMock.mockRejectedValueOnce(
      new Error("advisor action confirmation unavailable"),
    );

    fireEvent.click(acknowledgeButton);

    expect(
      await screen.findByText("Advisor evidence is not fully confirmed"),
    ).toBeInTheDocument();
    expect(screen.getByText("Evidence not confirmed")).toBeInTheDocument();
    expect(
      actionRecords.getByText("Policy evaluation requires compliance review."),
    ).toBeInTheDocument();
    expect(
      actionRecords.getByRole("button", { name: "Acknowledge review" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      actionRecords.getByText(
        "Review recorded; latest advisor evidence is not fully confirmed.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Action required")).not.toBeInTheDocument();
    fireEvent.click(
      actionRecords.getByRole("button", { name: "Acknowledge review" }),
    );
    expect(acknowledgeAdvisorCockpitActionMock).toHaveBeenCalledTimes(1);
  });

  it("hides cached cockpit evidence when a required confirmation is permission blocked", async () => {
    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    const actionRecords = within(
      await screen.findByTestId("advisor-cockpit-action-records"),
    );
    const acknowledgeButton = actionRecords.getByRole("button", {
      name: "Acknowledge review",
    });
    getAdvisorCockpitSupportabilityMock.mockRejectedValueOnce(
      new Error("Advisor cockpit supportability failed (403): forbidden"),
    );

    fireEvent.click(acknowledgeButton);

    expect(
      await screen.findByText("Advisor Cockpit access is not available"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your current role does not permit this portfolio's advisor operating evidence to be viewed.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Policy review required")).not.toBeInTheDocument();
    expect(screen.queryByText("Proposal and policy evidence available.")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Acknowledge review" }),
    ).not.toBeInTheDocument();
  });

  it("keeps previously loaded preparation evidence visible when its refresh fails", async () => {
    listAdvisorCockpitPreparationPacketsMock
      .mockResolvedValueOnce({
        total_count: 2,
        items: [
          {
            packet_id: "cached_packet_1",
            context_type: "PORTFOLIO",
            context_ref: "PB_SG_GLOBAL_BAL_001",
            status: "READY",
            evidence_refs: [
              { summary: "Previously loaded meeting preparation evidence." },
            ],
          },
        ],
      })
      .mockRejectedValueOnce(new Error("preparation refresh unavailable"));

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText("Previously loaded meeting preparation evidence."),
    ).toBeInTheDocument();

    const actionRecords = within(
      await screen.findByTestId("advisor-cockpit-action-records"),
    );
    fireEvent.click(
      actionRecords.getByRole("button", { name: "Acknowledge review" }),
    );

    expect(
      await screen.findByText("Meeting preparation refresh unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 previously loaded preparation pack remains visible, but the current source scope cannot be confirmed.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Previously loaded meeting preparation evidence."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Meeting preparation details unavailable"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "2 preparation packs are in scope; 1 is available for review.",
      ),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      totalCount: 0,
      staleTitle: "No preparation packs in scope",
    },
    {
      totalCount: 1,
      staleTitle: "Meeting preparation details unavailable",
    },
  ])(
    "does not present a cached $totalCount preparation-pack scope as current after refresh failure",
    async ({ totalCount, staleTitle }) => {
      listAdvisorCockpitPreparationPacketsMock
        .mockResolvedValueOnce({
          total_count: totalCount,
          items: [],
        })
        .mockRejectedValueOnce(new Error("preparation refresh unavailable"));

      renderWithQueryClient(
        <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
      );

      expect(await screen.findByText(staleTitle)).toBeInTheDocument();

      const actionRecords = within(
        await screen.findByTestId("advisor-cockpit-action-records"),
      );
      fireEvent.click(
        actionRecords.getByRole("button", { name: "Acknowledge review" }),
      );

      expect(
        await screen.findByText("Meeting preparation refresh unavailable"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "No previously loaded preparation packs remain visible, and the current source scope cannot be confirmed.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(staleTitle)).not.toBeInTheDocument();
    },
  );

  it("keeps the meeting preparation section visible when source packets are absent", async () => {
    listAdvisorCockpitPreparationPacketsMock.mockResolvedValueOnce({
      items: [],
      total_count: 0,
    });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Meeting Preparation",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("No preparation packs in scope")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The source reports no meeting preparation packs for this portfolio.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps a reported preparation scope partial when packet details are unavailable", async () => {
    listAdvisorCockpitPreparationPacketsMock.mockResolvedValueOnce({
      items: [],
      total_count: 1,
    });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText("Meeting preparation details unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 preparation pack is reported in scope, but its review evidence is not available.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No preparation packs in scope")).not.toBeInTheDocument();
  });

  it("does not infer an empty preparation scope when the source total is missing", async () => {
    listAdvisorCockpitPreparationPacketsMock.mockResolvedValueOnce({ items: [] });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText("Meeting preparation details unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The preparation scope and review evidence are not available for this portfolio.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No preparation packs in scope")).not.toBeInTheDocument();
  });

  it("discloses a minimum review count when preparation evidence has no source total", async () => {
    listAdvisorCockpitPreparationPacketsMock.mockResolvedValueOnce({
      items: [
        {
          packet_id: "packet_sg_001",
          context_type: "PROPOSAL",
          context_ref: "proposal_sg_001",
          status: "READY",
          evidence_refs: [
            { summary: "Suitability and policy evidence assembled." },
          ],
        },
      ],
    });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText(
        "At least 1 preparation pack is available for review; the full source scope is not reported.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Proposal proposal_sg_001")).toBeInTheDocument();
    expect(
      screen.queryByText("Meeting preparation details unavailable"),
    ).not.toBeInTheDocument();
  });

  it("keeps source actions partial when worklist details are unavailable", async () => {
    listAdvisorCockpitActionsMock.mockResolvedValueOnce({
      items: [],
      total_count: 1,
    });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findAllByText("Action details unavailable"),
    ).toHaveLength(2);
    expect(screen.getByLabelText("Advisor cockpit counts")).toHaveTextContent(
      /Actions in scope\s*1/,
    );
    expect(
      screen.getByText(
        "1 advisor action is reported in scope, but its review details are not available.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No open actions")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Acknowledge review" }),
    ).not.toBeInTheDocument();
  });

  it("does not claim an all-clear when the source action total is not reported", async () => {
    listAdvisorCockpitActionsMock.mockResolvedValueOnce({ items: [] });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findAllByText("Action details unavailable"),
    ).toHaveLength(2);
    expect(screen.getByLabelText("Advisor cockpit counts")).toHaveTextContent(
      /Actions in scope\s*Not reported/,
    );
    expect(
      screen.getByText(
        "The source action total and review details are not available for this portfolio.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No open actions")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No advisor actions require review"),
    ).not.toBeInTheDocument();
  });

  it("does not render fallback actions when the Gateway cockpit route fails", async () => {
    listAdvisorCockpitActionsMock.mockRejectedValueOnce(
      new Error("gateway unavailable"),
    );

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText("Advisor evidence is not fully confirmed"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Advisor action worklist unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The action worklist could not be loaded from the advisory workflow.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Evidence not confirmed")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Advisor priorities not fully confirmed" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No advisor actions require review"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No open actions")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Policy review required"),
    ).not.toBeInTheDocument();
  });

  it("keeps the worklist visible but the composite partial when a non-action source fails", async () => {
    getAdvisorCockpitSnapshotMock.mockResolvedValueOnce({
      snapshot_id: "cockpit_snapshot_with_preparation_fallback",
      action_counts: {
        "status.PENDING_REVIEW": 1,
        "status.BLOCKED": 0,
        "priority.HIGH": 1,
      },
      supportability: {
        gateway_posture: "SUPPORTED_BY_LOTUS_GATEWAY_RFC0026",
        workbench_posture: "CANONICAL_WORKBENCH_PROOF_PASSED_RFC0026",
        data_product_posture: "ACTIVE_ADVISOR_COCKPIT_PRODUCTS_RFC0026",
        client_ready_publication: "BLOCKED",
      },
      preparation_packets: [
        {
          packet_id: "snapshot_packet_1",
          context_type: "PORTFOLIO",
          context_ref: "PB_SG_GLOBAL_BAL_001",
          status: "READY",
          evidence_refs: [
            { summary: "Snapshot preparation evidence must not mask route failure." },
          ],
        },
      ],
      unsupported_capabilities: ["EXTERNAL_CLIENT_COMMUNICATION"],
    });
    listAdvisorCockpitPreparationPacketsMock.mockRejectedValueOnce(
      new Error("preparation unavailable"),
    );

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText("Advisor evidence is not fully confirmed"),
    ).toBeInTheDocument();
    expect(screen.getByText("Evidence not confirmed")).toBeInTheDocument();
    expect(screen.queryByText("Action required")).not.toBeInTheDocument();
    expect(screen.queryByText("Worklist unavailable")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Previously retrieved evidence remains visible, but one or more required sources could not be confirmed.",
      ),
    ).toBeInTheDocument();
    const actionRecords = within(
      screen.getByTestId("advisor-cockpit-action-records"),
    );
    expect(actionRecords.getByText("Policy review required")).toBeInTheDocument();
    expect(
      actionRecords.getByRole("button", { name: "Acknowledge review" }),
    ).toBeDisabled();
    expect(
      screen.queryByText("Advisor action worklist unavailable"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Meeting preparation details unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The preparation scope and review evidence are not available for this portfolio.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No preparation packs in scope")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Snapshot preparation evidence must not mask route failure."),
    ).not.toBeInTheDocument();
  });
});
